/**
 * Le sort de chaque objet, genre par genre. Aucune écriture ici.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { lireAgents, lireCommandes, OUTILS_HERITES } from "../../lecture/documents.ts";
import { listerDossiers } from "../../lecture/fichiers.ts";
import { lirePlugins } from "../../lecture/plugins.ts";
import { lireHooks, lirePermissions } from "../../lecture/reglages.ts";
import { enSlug, type Portee } from "../garde.ts";
import type { Operation } from "./plan.ts";

const AUCUNE = "";

/** Déjà là si le dossier existe, ou si Codex la lit déjà depuis `.agents/skills`. */
export function competences(claude: string, codex: string): Operation[] {
  return listerDossiers(join(claude, "skills")).map((nom) => {
    const source = join(claude, "skills", nom);
    const destination = join(codex, "skills", nom);
    const partagee = join(dirname(codex), ".agents", "skills", nom);
    const base = { genre: "compétence" as const, nom, source, destination };
    if (existsSync(destination)) return { ...base, statut: "déjà là" as const, note: "déjà dans skills/ — rien n'est écrasé" };
    if (existsSync(partagee)) return { ...base, statut: "déjà là" as const, note: `Codex la lit déjà depuis ${partagee}` };
    return { ...base, statut: "à écrire" as const, note: "copie du dossier entier, SKILL.md et fichiers d'étapes compris" };
  });
}

export function agents(claude: string, codex: string, portee: Portee): Operation[] {
  return lireAgents(claude, portee, AUCUNE).map((a) => {
    const destination = join(codex, "agents", `${enSlug(a.nom)}.toml`);
    const perdu = a.outils === OUTILS_HERITES ? "" : ` tools « ${a.outils} » se perd : Codex n'a pas de liste d'outils par agent.`;
    return {
      genre: "agent",
      nom: a.nom,
      source: a.chemin,
      destination,
      statut: existsSync(destination) ? "déjà là" : "à écrire",
      note: `name, description et model passent ; le corps devient developer_instructions.${perdu}`,
    };
  });
}

/** Codex n'a que des prompts personnels, au premier niveau de `prompts/`. */
export function commandes(claude: string, codex: string, portee: Portee): Operation[] {
  return lireCommandes(claude, portee, AUCUNE).map((c) => {
    if (portee === "projet") {
      return { genre: "commande", nom: `/${c.nom}`, source: c.chemin, destination: "", statut: "sans équivalent",
        note: "Codex n'a pas de prompts de projet. Copie-la dans ~/.codex/prompts, ou fais-en une compétence." };
    }
    const fichier = c.nom.replace(/:/g, "-");
    const destination = join(codex, "prompts", `${fichier}.md`);
    const aplati = c.nom.includes(":") ? ` Codex ne lit pas les sous-dossiers : /${c.nom} se tapera /prompts:${fichier}.` : "";
    return { genre: "commande", nom: `/${c.nom}`, source: c.chemin, destination,
      statut: existsSync(destination) ? "déjà là" : "à écrire", note: `copie telle quelle, tapée /prompts:${fichier}.${aplati}` };
  });
}

/** Même forme de JSON ; seules les commandes qui visent Claude Code restent. */
export function hooks(claude: string, codex: string, portee: Portee): Operation[] {
  const destination = join(codex, "hooks.json");
  return lireHooks(claude, portee).map((h) => {
    const nom = h.matcher ? `${h.evenement} · ${h.matcher}` : h.evenement;
    const base = { genre: "hook" as const, nom, source: join(claude, h.origine), destination };
    if (/claude/i.test(h.commande)) return { ...base, statut: "sans équivalent" as const, note: `la commande vise Claude Code : à réécrire pour Codex — ${h.commande}` };
    if (existsSync(destination)) return { ...base, statut: "déjà là" as const, note: "hooks.json existe déjà : rien n'y est ajouté" };
    return { ...base, statut: "à écrire" as const, note: `${h.commande}` };
  });
}

export function instructions(claude: string, codex: string, portee: Portee): Operation[] {
  const source = portee === "utilisateur" ? join(claude, "CLAUDE.md") : join(dirname(claude), "CLAUDE.md");
  const destination = portee === "utilisateur" ? join(codex, "AGENTS.md") : join(dirname(codex), "AGENTS.md");
  if (!existsSync(source)) return [];
  const autre = portee === "projet" ? " Ou déclare project_doc_fallback_filenames = [\"CLAUDE.md\"] dans config.toml, pour n'entretenir qu'un fichier." : "";
  return [{ genre: "instructions", nom: "CLAUDE.md → AGENTS.md", source, destination,
    statut: existsSync(destination) ? "déjà là" : "à écrire", note: `copie telle quelle.${autre}` }];
}

export function sansEquivalent(claude: string, portee: Portee): Operation[] {
  const trouves: Operation[] = [];
  const regles = lirePermissions(claude, portee).length;
  if (regles > 0) {
    trouves.push({ genre: "permissions", nom: `${regles} règles`, source: join(claude, "settings.json"), destination: "", statut: "sans équivalent",
      note: "Codex n'a pas d'allow/deny par motif : approval_policy et sandbox_mode, dans config.toml, en tiennent lieu." });
  }
  const plugins = portee === "utilisateur" ? lirePlugins(claude).filter((p) => p.active).length : 0;
  if (plugins > 0) {
    trouves.push({ genre: "plugins", nom: `${plugins} plugins activés`, source: join(claude, "settings.json"), destination: "", statut: "sans équivalent",
      note: "Les plugins Claude Code n'existent pas chez Codex. Cherche leurs homologues dans sa marketplace." });
  }
  return trouves;
}

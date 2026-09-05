/**
 * La lecture complète d'un `.codex` : les mêmes objets que pour `.claude`,
 * lus aux endroits où Codex les range.
 *
 * Compétences dans `skills/` de `.codex` et de `.agents`, agents en TOML,
 * prompts pour commandes, hooks dans `hooks.json` ou `[hooks]`, plugins dans
 * `config.toml`, et `AGENTS.md` pour instructions. Les types sont ceux de
 * `lib/types.ts` : un écran qui sait lire l'un sait lire l'autre.
 */

import { join } from "node:path";
import type { Agent, Commande, Competence, FichierInstructions, Hook, Plugin, Portee, Silence } from "../../types.ts";
import { lireCompetences } from "../competences.ts";
import { lireJson, lireTexte } from "../fichiers.ts";
import { hooksDepuisBloc } from "../reglages.ts";
import { lireAgentsCodex } from "./agents.ts";
import { lireConfigCodex, projetApprouve, type ConfigCodex } from "./config.ts";
import { lirePluginsCodex } from "./plugins.ts";
import { lirePrompts } from "./prompts.ts";
import { dossierAgentsUtilisateur, dossierProjet, racineCodexProjet, racineCodexUtilisateur } from "./racines.ts";

export interface AtelierCodex {
  racineUtilisateur: string;
  racineProjet: string | null;
  dossierProjet: string | null;
  config: ConfigCodex;
  competences: Competence[];
  agents: Agent[];
  commandes: Commande[];
  hooks: Hook[];
  plugins: Plugin[];
  instructions: FichierInstructions[];
  /** Ce qui éteint plus qu'un fichier : un dossier entier, ou tous les hooks. */
  silences: Silence[];
}

type Source = [racine: string, portee: Portee, origine: string];

export function lireAtelierCodex(): AtelierCodex {
  const utilisateur = racineCodexUtilisateur();
  const projet = dossierProjet();
  const codexProjet = racineCodexProjet();
  const config = lireConfigCodex(utilisateur);

  const sources: Source[] = [
    [utilisateur, "utilisateur", "~/.codex"],
    [dossierAgentsUtilisateur(), "utilisateur", "~/.agents"],
    ...(projet ? ([[join(projet, ".codex"), "projet", ".codex"], [join(projet, ".agents"), "projet", ".agents"]] as Source[]) : []),
  ];

  return {
    racineUtilisateur: utilisateur,
    racineProjet: codexProjet,
    dossierProjet: projet,
    config,
    competences: sources.flatMap(([r, p, o]) => lireCompetences(r, p, o)),
    agents: sources.flatMap(([r, p, o]) => lireAgentsCodex(r, p, o)),
    commandes: sources.flatMap(([r, p, o]) => lirePrompts(r, p, o)),
    hooks: [...hooksDe(utilisateur, "utilisateur", config), ...(codexProjet ? hooksDe(codexProjet, "projet") : [])],
    plugins: lirePluginsCodex(utilisateur),
    instructions: lireInstructions(utilisateur, projet),
    silences: silencesGlobaux(config, projet, codexProjet),
  };
}

/** `hooks.json` d'abord, puis le bloc `[hooks]` du `config.toml` voisin. */
function hooksDe(racine: string, portee: Portee, config = lireConfigCodex(racine)): Hook[] {
  return [
    ...hooksDepuisBloc(lireJson(join(racine, "hooks.json")).hooks, portee, "hooks.json"),
    ...hooksDepuisBloc(config.hooks, portee, "config.toml"),
  ];
}

function lireInstructions(utilisateur: string, projet: string | null): FichierInstructions[] {
  const candidats: Array<[string, Portee]> = [
    [join(utilisateur, "AGENTS.md"), "utilisateur"],
    ...(projet ? ([[join(projet, "AGENTS.md"), "projet"]] as Array<[string, Portee]>) : []),
  ];
  return candidats.flatMap(([chemin, portee]) => {
    const contenu = lireTexte(chemin);
    if (contenu === null) return [];
    return [{ chemin, portee, octets: Buffer.byteLength(contenu, "utf8"), lignes: contenu.split("\n").length }];
  });
}

function silencesGlobaux(config: ConfigCodex, projet: string | null, codexProjet: string | null): Silence[] {
  const trouves: Silence[] = [];
  if (config.erreur) {
    trouves.push({ cause: "config.toml illisible", detail: `${config.erreur}. Codex démarre sans, et rien de ce qui y est déclaré ne s'applique.` });
  }
  if (projet && codexProjet && !projetApprouve(config, projet)) {
    trouves.push({
      cause: "projet non approuvé",
      detail: `${projet} n'a pas de trust_level = "trusted" dans config.toml : Codex ignore son dossier .codex — config, hooks et règles.`,
    });
  }
  if (!config.hooksActifs) {
    trouves.push({ cause: "hooks éteints", detail: "features.hooks = false : les hooks déclarés ne se déclenchent pas." });
  }
  return trouves;
}

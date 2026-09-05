/**
 * Écrire ce que le plan a montré — et rien d'autre.
 *
 * Deux règles, sans exception. Rien n'est jamais écrasé : une destination
 * qui existe est laissée telle quelle, c'est le plan qui l'a dite « déjà là »
 * et le garde qui le revérifie au moment d'écrire. Et rien ne sort de la
 * racine visée : `~/.codex` ou `<projet>/.codex`, plus l'`AGENTS.md` du
 * projet, qui vit à sa racine parce que Codex l'y cherche.
 */

import { cpSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { decouper, lireTexte } from "../../lecture/fichiers.ts";
import { lireHooks } from "../../lecture/reglages.ts";
import { doitEtreLibre, EcritureRefusee, ecrireAtomiquement, type Portee } from "../garde.ts";
import { agentEnToml } from "./agent-toml.ts";
import { hooksEnJson } from "./hooks-json.ts";
import { planifierConversion, type Operation, type PlanConversion } from "./plan.ts";

export interface Bilan {
  ecrits: string[];
  laisses: number;
  sansEquivalent: number;
}

export function convertir(portee: Portee): Bilan {
  const plan = planifierConversion(portee);
  const aEcrire = plan.operations.filter((o) => o.statut === "à écrire");
  const ecrits: string[] = [];

  for (const op of aEcrire.filter((o) => o.genre !== "hook")) {
    ecrire(op, plan);
    ecrits.push(op.destination);
  }

  const hooks = aEcrire.filter((o) => o.genre === "hook");
  if (hooks.length > 0) {
    const destination = verifier(hooks[0].destination, plan);
    const gardes = lireHooks(plan.source, portee).filter((h) => !/claude/i.test(h.commande));
    ecrireAtomiquement(destination, hooksEnJson(gardes));
    ecrits.push(destination);
  }

  return {
    ecrits,
    laisses: plan.operations.filter((o) => o.statut === "déjà là").length,
    sansEquivalent: plan.operations.filter((o) => o.statut === "sans équivalent").length,
  };
}

function ecrire(op: Operation, plan: PlanConversion): void {
  const destination = verifier(op.destination, plan);
  if (op.genre === "compétence") {
    mkdirSync(dirname(destination), { recursive: true });
    // Les liens symboliques restent des liens, cible relative intacte : un
    // `../../.agents/skills/x` vise le même dossier depuis `.codex` que depuis `.claude`.
    cpSync(op.source, destination, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    return;
  }
  if (op.genre === "agent") {
    ecrireAtomiquement(destination, agentEnToml(agentDepuis(op.source)));
    return;
  }
  ecrireAtomiquement(destination, lireTexte(op.source) ?? "");
}

function agentDepuis(chemin: string) {
  const { entete, corps } = decouper(lireTexte(chemin) ?? "");
  const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return { nom: texte(entete.name) || basename(chemin, ".md"), description: texte(entete.description), modele: texte(entete.model), corps: corps.trim() };
}

/** Sous la racine visée — ou `AGENTS.md` juste à côté —, jamais dans un cache, jamais par-dessus. */
function verifier(chemin: string, plan: PlanConversion): string {
  const absolu = resolve(chemin);
  const racine = resolve(plan.destination);
  const instructionsDuProjet = absolu === resolve(dirname(racine), "AGENTS.md");
  if (!absolu.startsWith(`${racine}/`) && !instructionsDuProjet) {
    throw new EcritureRefusee(`${absolu} est hors de ${racine} : rien n'a été écrit.`);
  }
  if (absolu.includes("/plugins/cache/")) {
    throw new EcritureRefusee("Un plugin est un clone : y écrire serait perdu à la prochaine mise à jour.");
  }
  doitEtreLibre(absolu);
  return absolu;
}

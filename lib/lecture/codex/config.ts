/**
 * Ce qu'Orcha retient de `config.toml`.
 *
 * Pas tout : le fichier porte des dizaines de clés, et la plupart n'ont pas
 * d'effet silencieux. On garde ce qui situe une session — modèle, approbation,
 * bac à sable — et ce qui peut éteindre un dossier entier sans un mot : la
 * confiance accordée au projet, et l'interrupteur des hooks.
 */

import { dirname, join } from "node:path";
import { lireToml, table, texte } from "./toml.ts";

export interface ConfigCodex {
  chemin: string;
  presente: boolean;
  modele: string;
  /** `approval_policy` : untrusted, on-request, never… */
  approbation: string;
  /** `sandbox_mode` : read-only, workspace-write, danger-full-access. */
  bacASable: string;
  /** Les chemins portant `trust_level = "trusted"`. */
  projetsApprouves: string[];
  /** `features.hooks` — vrai par défaut, faux si éteint explicitement. */
  hooksActifs: boolean;
  /** Le bloc `[hooks]`, dans la forme de `hooks.json`. */
  hooks: unknown;
  erreur: string | null;
}

export function lireConfigCodex(racine: string): ConfigCodex {
  const chemin = join(racine, "config.toml");
  const { valeur, erreur, absent } = lireToml(chemin);
  const features = table(valeur.features);

  return {
    chemin,
    presente: !absent,
    modele: texte(valeur.model),
    approbation: texte(valeur.approval_policy),
    bacASable: texte(valeur.sandbox_mode),
    projetsApprouves: approuves(table(valeur.projects)),
    hooksActifs: features.hooks !== false && features.codex_hooks !== false,
    hooks: valeur.hooks,
    erreur,
  };
}

function approuves(projets: Record<string, unknown>): string[] {
  return Object.entries(projets)
    .filter(([, bloc]) => table(bloc).trust_level === "trusted")
    .map(([chemin]) => chemin);
}

/**
 * Le projet, ou l'un de ses parents, est-il approuvé ?
 *
 * Le parent compte : un dossier de travail approuvé couvre les dépôts qu'il
 * contient. Un outil qui dirait « non approuvé » à tort produirait exactement
 * la fausse panne qu'Orcha s'interdit.
 */
export function projetApprouve(config: ConfigCodex, dossier: string): boolean {
  let courant = dossier;
  while (true) {
    if (config.projetsApprouves.includes(courant)) return true;
    const parent = dirname(courant);
    if (parent === courant) return false;
    courant = parent;
  }
}

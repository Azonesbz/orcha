/**
 * Où Codex range sa configuration.
 *
 * `~/.codex` — ou `CODEX_HOME` — pour le personnel, `<projet>/.codex` pour le
 * projet. Et un troisième dossier, `.agents`, partagé entre outils : Codex y
 * lit ses compétences, à la maison comme dans un dépôt. Il est déduit de
 * `~/.codex` plutôt que de `~` pour qu'un `CODEX_HOME` jetable emporte son
 * voisin — c'est ce qui rend les tests possibles sans toucher au vrai disque.
 *
 * Le projet est celui que l'interface regarde déjà : le dossier qui porte le
 * `.claude`, sans exception. Un seul sélecteur, une seule vérité.
 */

import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { estDossier, racineProjet } from "../fichiers.ts";

export function racineCodexUtilisateur(): string {
  return process.env.CODEX_HOME || join(homedir(), ".codex");
}

/** `~/.agents`, ou le voisin d'un `CODEX_HOME` déplacé. */
export function dossierAgentsUtilisateur(): string {
  return join(dirname(racineCodexUtilisateur()), ".agents");
}

/** Le dossier du projet regardé — celui qui contient le `.claude`, pas le `.claude`. */
export function dossierProjet(): string | null {
  const claude = racineProjet();
  return claude ? dirname(claude) : null;
}

/** `<projet>/.codex`, s'il existe. */
export function racineCodexProjet(): string | null {
  const projet = dossierProjet();
  if (!projet) return null;
  const codex = join(projet, ".codex");
  return estDossier(codex) ? codex : null;
}

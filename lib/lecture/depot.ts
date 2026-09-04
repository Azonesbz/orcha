/**
 * Le dépôt Git qui contient un dossier, s'il y en a un.
 *
 * L'agent voit le dépôt par `--add-dir`, et y a git et gh. Ce qu'il ne savait
 * pas, c'est où il pose les pieds : sur quelle branche, et si l'arbre est déjà
 * en chantier. Sans ce fait, il écrit sur `main` sans le savoir — et la règle
 * qui le lui interdit n'a rien sur quoi s'appuyer.
 *
 * Trois appels à git plutôt qu'un `.git` deviné : un worktree, un sous-module
 * ou un `GIT_DIR` déplacé n'ont pas de `.git` là où on le chercherait.
 */

import { spawnSync } from "node:child_process";

export interface Depot {
  racine: string;
  /** Vide quand HEAD est détaché : il n'y a alors pas de branche. */
  branche: string;
  /** Ni fichier modifié, ni fichier non suivi. */
  propre: boolean;
}

export function depotDe(dossier: string): Depot | null {
  const racine = git(dossier, "rev-parse", "--show-toplevel");
  if (racine === null) return null;
  return {
    racine,
    branche: git(dossier, "branch", "--show-current") ?? "",
    propre: (git(dossier, "status", "--porcelain") ?? "") === "",
  };
}

/** La sortie de git sans sa fin de ligne — null si git refuse, ou manque. */
function git(dossier: string, ...args: string[]): string | null {
  const essai = spawnSync("git", ["-C", dossier, ...args], { encoding: "utf8", timeout: 3000 });
  if (essai.error || essai.status !== 0) return null;
  return essai.stdout.replace(/\n$/, "");
}

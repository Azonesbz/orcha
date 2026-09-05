/**
 * Le plan de conversion d'un `.claude` vers un `.codex`.
 *
 * Chaque objet a un sort, et le plan le dit ligne à ligne avant qu'une seule
 * écriture ait lieu : copié tel quel (compétence, prompt, instructions),
 * traduit (agent Markdown → TOML), déjà là (jamais écrasé), ou sans
 * équivalent — permissions, plugins, commandes de projet, hooks qui visent
 * Claude Code. Le plan ne touche pas au disque.
 */

import { join } from "node:path";
import { dossierProjet, racineCodexUtilisateur } from "../../lecture/codex/racines.ts";
import { EcritureRefusee, racineDe, type Portee } from "../garde.ts";
import { agents, commandes, competences, hooks, instructions, sansEquivalent } from "./operations.ts";

export type Genre = "compétence" | "agent" | "commande" | "hook" | "instructions" | "permissions" | "plugins";
export type Statut = "à écrire" | "déjà là" | "sans équivalent";

export interface Operation {
  genre: Genre;
  nom: string;
  source: string;
  destination: string;
  statut: Statut;
  /** Pourquoi ce sort, ou ce qui se perd en route. Jamais vide pour un refus. */
  note: string;
}

export interface PlanConversion {
  portee: Portee;
  source: string;
  destination: string;
  operations: Operation[];
}

/** `~/.codex` pour le personnel, `<projet>/.codex` pour le projet. */
export function destinationDe(portee: Portee): string {
  if (portee === "utilisateur") return racineCodexUtilisateur();
  const projet = dossierProjet();
  if (!projet) throw new EcritureRefusee("Aucun projet n'est lu : rien à convertir.");
  return join(projet, ".codex");
}

export function planifierConversion(portee: Portee): PlanConversion {
  const claude = racineDe(portee);
  const codex = destinationDe(portee);
  return {
    portee,
    source: claude,
    destination: codex,
    operations: [
      ...competences(claude, codex),
      ...agents(claude, codex, portee),
      ...commandes(claude, codex, portee),
      ...hooks(claude, codex, portee),
      ...instructions(claude, codex, portee),
      ...sansEquivalent(claude, portee),
    ],
  };
}

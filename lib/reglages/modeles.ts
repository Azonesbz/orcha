/**
 * Les modèles proposés — sans dépendance au disque.
 *
 * Ce fichier est séparé de `config.ts` parce que l'écran des réglages en a
 * besoin côté navigateur, et que `config.ts` importe `node:fs` : les
 * rassembler tirerait le système de fichiers dans le paquet client, où il
 * n'existe pas.
 *
 * Le premier de la liste est celui par défaut.
 */
export const MODELES = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"] as const;

export type Modele = (typeof MODELES)[number];

export function estModele(valeur: unknown): valeur is Modele {
  return typeof valeur === "string" && (MODELES as readonly string[]).includes(valeur);
}

/**
 * Les deux types que portent les primitives.
 *
 * Repris tels quels de `lib/types.ts` de l'application : la portée dit d'où
 * vient un élément, le silence dit ce qui est déclaré sans effet. Ce sont les
 * seules notions du domaine que la charte expose — tout le reste est du style.
 */

/** D'où vient un élément, de la plus proche à la plus lointaine. */
export type Portee = "utilisateur" | "projet" | "plugin" | "intégré";

/** Ce qui est présent mais sans effet, avec la règle qui l'a détecté. */
export interface Silence {
  /** La règle qui a levé l'écart, en trois mots. */
  cause: string;
  /** Pourquoi ça ne charge pas, en une phrase. */
  detail: string;
}

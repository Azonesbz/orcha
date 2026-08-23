import type { Portee } from "./types";

/**
 * La provenance, codée par teinte — la seule couleur signifiante de la charte
 * avec le Rouge des silences.
 *
 * Deux teintes et un neutre : le projet en Citron, le personnel en Ciel, le
 * reste en Sourdine. Bordure et encre, jamais d'aplat : un aplat de couleur
 * ferait de la provenance une décoration, alors qu'elle est une information.
 */
export const COULEUR_PORTEE: Record<Portee, string> = {
  utilisateur: "border-[rgba(125,211,252,0.35)] text-sky",
  projet: "border-[rgba(163,230,53,0.4)] text-accent",
  plugin: "border-[rgba(240,232,214,0.2)] text-muted",
  intégré: "border-[rgba(240,232,214,0.2)] text-muted",
};

/**
 * Les mêmes teintes pour la barre de répartition.
 *
 * Indexée par le nom de la part et non par son rang : « Toi » disparaît quand
 * la case « inclure les réglages personnels » est décochée, et un encodage par
 * rang donnerait alors le Ciel aux plugins.
 */
export const COULEUR_PART: Record<string, string> = {
  "Ce projet": "#a3e635",
  Toi: "#7dd3fc",
  Plugins: "#57534e",
};

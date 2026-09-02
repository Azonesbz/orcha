/**
 * Une durée, dite en français.
 *
 * Une *durée* et non un *écoulé* : `lib/reglages/duree.ts` dit « il y a deux
 * heures » à partir d'une date, celle-ci dit « 2 h 07 » à partir d'un nombre de
 * millisecondes. Deux besoins, deux fonctions.
 */
export function duree(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

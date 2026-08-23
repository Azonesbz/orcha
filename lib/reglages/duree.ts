/**
 * Le temps écoulé, dit en français.
 *
 * L'horloge est un argument : sans cela la fonction ne se testerait pas, et
 * surtout le serveur et le navigateur rendraient deux textes différents pour
 * la même donnée — React signale alors une divergence d'hydratation.
 */

const PALIERS = [
  { seuil: 86400, unite: "jour" },
  { seuil: 3600, unite: "heure" },
  { seuil: 60, unite: "minute" },
] as const;

export function ilYA(quand: string, maintenant: Date): string {
  const date = new Date(quand);
  if (quand === "" || Number.isNaN(date.getTime())) return "";

  const secondes = (maintenant.getTime() - date.getTime()) / 1000;
  // Une horloge qui recule — changement d'heure, machine resynchronisée — ne
  // doit pas produire « dans 5 minutes » sur un événement déjà arrivé.
  if (secondes < 60) return "à l'instant";

  const palier = PALIERS.find((p) => secondes >= p.seuil);
  if (!palier) return "à l'instant";

  const compte = Math.floor(secondes / palier.seuil);
  return `il y a ${compte} ${palier.unite}${compte > 1 ? "s" : ""}`;
}

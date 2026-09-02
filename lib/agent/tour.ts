/**
 * Un tour de la discussion, et ce que les gestes y versent.
 *
 * Hors du composant parce que c'est une règle, pas un affichage : le premier
 * dénouement gagne. Le CLI rend volontiers son échec deux fois — sa propre
 * phrase (« Not logged in · Please run /login »), puis le code de sortie que
 * le lanceur traduit (« s'est arrêté avec le code 1 »). Le second écrasait le
 * premier, et l'écran affichait un numéro là où il y avait une consigne.
 */

import type { Geste } from "../claude/flux.ts";

export interface Tour {
  qui: "moi" | "agent";
  texte: string;
  echec?: boolean;
  /** Ce que l'agent a fait pour ce tour-là, dans l'ordre. */
  gestes?: Geste[];
}

/** Le geste rejoint le dernier tour ; la fin et l'échec le closent, une fois. */
export function versee(tours: Tour[], geste: Geste): Tour[] {
  const dernier = tours.at(-1);
  if (dernier?.qui !== "agent") return tours;

  const denoue = geste.sorte === "fin" || geste.sorte === "echec";
  if (denoue && dernier.texte !== "") return tours;

  const change: Tour = denoue
    ? {
        ...dernier,
        texte: geste.quoi,
        echec: geste.sorte === "echec",
        gestes: sansLaReponse(dernier.gestes ?? [], geste.quoi),
      }
    : { ...dernier, gestes: [...(dernier.gestes ?? []), geste] };
  return [...tours.slice(0, -1), change];
}

/**
 * La réponse, retirée de la piste qui l'a annoncée.
 *
 * Le dernier bloc de texte de l'agent EST la réponse : le CLI le rend une fois
 * au fil de l'eau, puis une seconde fois comme résultat. Sans ce retrait, elle
 * s'affichait deux fois de suite — en gris dans la piste, puis en clair
 * dessous. On ne coupe que la queue : le récit du début (« je vais ouvrir… »)
 * est ce qu'on est venu voir.
 */
function sansLaReponse(gestes: Geste[], reponse: string): Geste[] {
  let fin = gestes.length;
  while (fin > 0) {
    const geste = gestes[fin - 1];
    if (geste.sorte !== "note" || !reponse.includes(geste.quoi)) break;
    fin -= 1;
  }
  return gestes.slice(0, fin);
}

/**
 * Le lissage d'une réponse qui arrive par paquets.
 *
 * Le CLI groupe les fragments par seconde : une quarantaine de mots d'un coup,
 * puis rien, puis quarante autres. Relayés tels quels, ils sautent à l'écran.
 * L'écran les déroule donc mot à mot, à un pas qui suit le retard : un mot par
 * tic quand il n'y a presque rien, davantage quand un paquet attend — pour
 * qu'il soit déroulé avant que le suivant n'arrive, jamais avant.
 *
 * Fonctions pures sur une chaîne et un index : la cadence est un détail du
 * composant, la coupe est une règle, et c'est elle qui se teste.
 */

/** Combien de tics de 30 ms pour dérouler un paquet : une seconde, le temps du suivant. */
const TICS_PAR_PAQUET = 33;

const BLANC = /\s/;

/** L'index de coupe après `mots` mots de plus, jamais au milieu d'un mot. */
export function avancer(texte: string, depuis: number, mots: number): number {
  let i = depuis;
  for (let n = 0; n < mots && i < texte.length; n++) {
    while (i < texte.length && BLANC.test(texte[i])) i++;
    while (i < texte.length && !BLANC.test(texte[i])) i++;
  }
  return i;
}

/** Les mots qui restent à dérouler, depuis la coupe. */
export function motsRestants(texte: string, depuis: number): number {
  return texte.slice(depuis).split(/\s+/).filter((mot) => mot !== "").length;
}

/** Combien de mots révéler à ce tic : un, ou ce qu'il faut pour rattraper. */
export function pasDeRevelation(restants: number): number {
  return Math.max(1, Math.ceil(restants / TICS_PAR_PAQUET));
}

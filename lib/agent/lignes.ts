/**
 * Un flux d'octets, redécoupé en lignes.
 *
 * `ReadableStream` rend des blocs, pas des lignes : la coupure tombe où le
 * réseau l'a décidée, volontiers au milieu d'un JSON. Ce qui reste après la
 * dernière fin de ligne attend le bloc suivant — sinon un geste sur deux se
 * perd, et en silence, puisqu'un JSON tronqué s'ignore.
 *
 * Fonction pure sur deux chaînes : c'est le seul morceau du chemin client qu'on
 * peut prouver sans navigateur, et c'est celui qui casse.
 */
export function decouper(reste: string, bloc: string): { lignes: string[]; reste: string } {
  const morceaux = (reste + bloc).split("\n");
  return {
    // La dernière n'est une ligne que si le bloc s'est fini sur une coupure —
    // auquel cas `split` rend "" et le tampon repart vide.
    reste: morceaux.pop() ?? "",
    lignes: morceaux.filter((l) => l.trim() !== ""),
  };
}

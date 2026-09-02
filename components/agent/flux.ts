/**
 * Le flux de l'agent, lu depuis le navigateur.
 *
 * `fetch` plutôt qu'une action serveur : c'est la seule des deux qui rend un
 * corps au fil de l'eau, et tout l'intérêt est là — voir le premier geste dans
 * la seconde, pas la réponse entière dans six minutes.
 *
 * L'identité de la conversation arrive par l'en-tête, pas par le flux : elle
 * est connue dès la réponse, avant le moindre geste, et n'a rien à faire dans
 * un vocabulaire qui décrit ce que l'agent FAIT.
 */

import { decouper } from "@/lib/agent/lignes";
import type { Geste } from "@/lib/claude/flux";

export interface Demande {
  chemin: string;
  instruction: string;
  /** Vide au premier tour : le serveur ouvre alors la conversation. */
  session: string;
  contexteNeuf: boolean;
}

export interface Ouverture {
  session: string;
  gestes: AsyncGenerator<Geste>;
}

export async function ouvrir(demande: Demande, signal: AbortSignal): Promise<Ouverture> {
  const reponse = await fetch("/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(demande),
    signal,
  });

  if (!reponse.ok || !reponse.body) {
    throw new Error(`L'agent n'a pas pu être joint (${reponse.status}).`);
  }
  return {
    session: reponse.headers.get("x-session") ?? demande.session,
    gestes: enGestes(reponse.body),
  };
}

async function* enGestes(corps: ReadableStream<Uint8Array>): AsyncGenerator<Geste> {
  const lecteur = corps.getReader();
  // `TextDecoder` en mode flux plutôt qu'un `TextDecoderStream` : un bloc peut
  // couper un caractère accentué en deux, et « étape » deviendrait « �tape ».
  const decodeur = new TextDecoder();
  let reste = "";
  try {
    for (;;) {
      const { value, done } = await lecteur.read();
      if (done) break;
      const coupe = decouper(reste, decodeur.decode(value, { stream: true }));
      reste = coupe.reste;
      for (const ligne of coupe.lignes) {
        const geste = analyser(ligne);
        if (geste) yield geste;
      }
    }
  } finally {
    // Onglet fermé, navigation, envoi suivant : on rend la main au serveur,
    // qui tue le CLI. Un agent orphelin continuerait d'écrire dans `.claude`.
    lecteur.cancel().catch(() => {});
  }
}

/** Une ligne illisible s'ignore : elle ne vaut pas la perte des vingt autres. */
function analyser(ligne: string): Geste | null {
  try {
    return JSON.parse(ligne) as Geste;
  } catch {
    return null;
  }
}

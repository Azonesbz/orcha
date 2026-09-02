/**
 * Le passage de l'agent vers l'écran, en flux.
 *
 * Une action serveur ne peut rendre qu'une valeur, une fois : c'est ce qui
 * imposait « Thinking… » pendant six minutes puis un bloc de texte. Une route
 * peut rendre un corps qui s'écrit au fil de l'eau — d'où ce déménagement, qui
 * n'est pas un goût d'architecture mais la seule façon de montrer le travail
 * pendant qu'il se fait.
 *
 * Elle est mince, comme toute entrée : elle résout le contexte, prend le filet,
 * et recopie les gestes. Le refus public, lui, vit dans `suivreLAgent` — au
 * passage obligé vers le CLI, pas ici, pour qu'aucune autre entrée ne puisse
 * l'oublier.
 *
 * Une ligne JSON par geste (NDJSON) plutôt que des événements SSE : le client
 * lit déjà du JSON ligne à ligne de l'autre côté, et `text/event-stream`
 * ajouterait un format d'enveloppe pour rien.
 */

import { randomUUID } from "node:crypto";
import { contexteDe } from "@/lib/agent/contexte";
import { prendreInstantane } from "@/lib/agent/instantane";
import { suivreLAgent } from "@/lib/claude/agent";
import { ecritureOuverte } from "@/lib/acces/etat";
import { lireConfig } from "@/lib/reglages/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Demande {
  chemin: string;
  instruction: string;
  /** Vide au premier tour : c'est ici qu'on ouvre la conversation. */
  session?: string;
  /** L'écran a changé depuis le tour précédent. */
  contexteNeuf?: boolean;
}

export async function POST(requete: Request): Promise<Response> {
  const demande = (await requete.json()) as Demande;
  const session = demande.session || randomUUID();
  const contexte = contexteDe(demande.chemin);
  const ecrit = contexte.peutEcrire && (await ecritureOuverte());

  // L'instantané se prend AVANT l'appel : après, il ne servirait plus à rien.
  // C'est ce qui remplace la relecture que l'agent n'a pas.
  if (ecrit) filetDeSecurite(contexte.dossier);

  const flux = suivreLAgent(
    { ...contexte, peutEcrire: ecrit },
    demande.instruction,
    lireConfig().modele,
    session,
    !demande.session,
    !demande.session || demande.contexteNeuf === true,
  );

  return new Response(enLignes(flux), {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      // La conversation appartient au CLI ; l'écran a besoin de son identité
      // dès l'en-tête, avant que le premier geste ne tombe.
      "x-session": session,
      // Un proxy qui met en tampon rendrait le flux inutile : il arriverait
      // d'un bloc, exactement ce qu'on vient de défaire.
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function enLignes(flux: AsyncGenerator<{ sorte: string; quoi: string }>): ReadableStream {
  const encodeur = new TextEncoder();
  return new ReadableStream({
    async pull(controleur) {
      const { value, done } = await flux.next();
      if (done) return controleur.close();
      controleur.enqueue(encodeur.encode(`${JSON.stringify(value)}\n`));
    },
    // Onglet fermé, requête abandonnée : on ferme le générateur, qui tue le
    // CLI. Sans ça, un agent orphelin continue d'écrire dans `.claude`.
    cancel: () => void flux.return(undefined),
  });
}

/** Un périmètre absent n'est pas une raison de refuser une simple question. */
function filetDeSecurite(dossier: string): void {
  try {
    prendreInstantane(dossier);
  } catch {
    // L'agent part quand même : il lira, au pire.
  }
}

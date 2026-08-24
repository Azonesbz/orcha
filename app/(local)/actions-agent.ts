"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { contexteDe } from "@/lib/agent/contexte";
import { prendreInstantane } from "@/lib/agent/instantane";
import { demanderALAgent } from "@/lib/claude/agent";
import { ecritureOuverte } from "@/lib/acces/etat";
import { lireConfig } from "@/lib/reglages/config";

/** Ce que l'écran a besoin de savoir avant même de poser une question. */
export interface ApercuContexte {
  titre: string;
  suggestions: string[];
  peutEcrire: boolean;
}

/**
 * Le contexte de la route, sans son résumé.
 *
 * Le résumé peut contenir un fichier entier : il est recalculé au moment de
 * l'appel, côté serveur, plutôt que de faire l'aller-retour par le navigateur.
 */
export async function lireContexte(chemin: string): Promise<ApercuContexte> {
  const c = contexteDe(chemin);
  return { titre: c.titre, suggestions: c.suggestions, peutEcrire: c.peutEcrire };
}

export interface RetourAgent {
  etat: "vierge" | "repondu" | "refuse";
  texte: string;
  /** L'instantané pris avant écriture, s'il y en a eu un. */
  instantane: string;
  /** Ce que l'instantané couvre, pour le dire à l'utilisateur. */
  dossier: string;
  /** La conversation en cours. C'est le CLI qui la tient, pas Orcha. */
  session: string;
}

export async function demander(_precedent: RetourAgent, donnees: FormData): Promise<RetourAgent> {
  const chemin = String(donnees.get("chemin") ?? "/");
  const instruction = String(donnees.get("instruction") ?? "");
  const contexte = contexteDe(chemin);

  // Session vide = premier tour : on l'ouvre et on donne le contexte de l'écran.
  const recue = String(donnees.get("session") ?? "");
  const session = recue || randomUUID();
  // La conversation suit l'utilisateur d'un écran à l'autre. Quand il change de
  // page, on ne repart pas de zéro : on dit à l'agent où il regarde maintenant,
  // comme on le dirait à quelqu'un qui suit par-dessus notre épaule.
  const contexteNeuf = recue === "" || donnees.get("contexteNeuf") === "1";
  const ecrit = contexte.peutEcrire && (await ecritureOuverte());

  // L'instantané se prend AVANT l'appel : après, il ne servirait plus à rien.
  // C'est ce qui remplace la relecture que l'agent n'a pas.
  let instantane = "";
  try {
    if (ecrit) instantane = prendreInstantane(contexte.dossier).id;
  } catch {
    // Un périmètre absent n'est pas une raison de refuser une simple question.
  }

  try {
    const texte = await demanderALAgent(
      { ...contexte, peutEcrire: ecrit },
      instruction,
      lireConfig().modele,
      session,
      recue === "",
      contexteNeuf,
    );
    revalidatePath("/", "layout");
    return { etat: "repondu", texte, instantane, dossier: contexte.dossier, session };
  } catch (erreur) {
    return {
      etat: "refuse",
      texte: erreur instanceof Error ? erreur.message : "L'agent a échoué.",
      instantane,
      dossier: contexte.dossier,
      // La session reste : une erreur réseau ne doit pas perdre l'historique.
      session,
    };
  }
}

/* Le retour arrière n'a plus de bouton : l'encart par tour alourdissait le fil.
   L'instantané, lui, est toujours pris avant chaque écriture — la capacité
   reste entière, seule sa surface a disparu. Pour revenir en arrière :
   `restaurer(id)` de lib/agent/instantane.ts, ou à la main depuis
   ~/.orcha/instantanes/<id>/contenu. */

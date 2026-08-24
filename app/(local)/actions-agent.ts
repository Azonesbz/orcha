"use server";

import { revalidatePath } from "next/cache";
import { contexteDe } from "@/lib/agent/contexte";
import { prendreInstantane, restaurer } from "@/lib/agent/instantane";
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
}

export async function demander(_precedent: RetourAgent, donnees: FormData): Promise<RetourAgent> {
  const chemin = String(donnees.get("chemin") ?? "/");
  const instruction = String(donnees.get("instruction") ?? "");
  const contexte = contexteDe(chemin);
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
    );
    revalidatePath("/", "layout");
    return { etat: "repondu", texte, instantane, dossier: contexte.dossier };
  } catch (erreur) {
    return {
      etat: "refuse",
      texte: erreur instanceof Error ? erreur.message : "L'agent a échoué.",
      instantane,
      dossier: contexte.dossier,
    };
  }
}

/** Le retour arrière — le filet, puisqu'il n'y a pas eu de relecture. */
export async function annuler(_precedent: RetourAgent, donnees: FormData): Promise<RetourAgent> {
  const id = String(donnees.get("instantane") ?? "");
  try {
    const remis = restaurer(id);
    revalidatePath("/", "layout");
    return {
      etat: "repondu",
      texte: `Revenu à l'état d'avant : ${remis.dossier}`,
      instantane: "",
      dossier: remis.dossier,
    };
  } catch (erreur) {
    return {
      etat: "refuse",
      texte: erreur instanceof Error ? erreur.message : "Restauration impossible.",
      instantane: id,
      dossier: "",
    };
  }
}

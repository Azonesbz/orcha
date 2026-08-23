"use server";

import { revalidatePath } from "next/cache";
import { verifierCle } from "@/lib/claude/proposition";
import { ecrireConfig, lireConfig } from "@/lib/reglages/config";
import { estModele, type Modele } from "@/lib/reglages/modeles";

export interface RetourReglages {
  etat: "vierge" | "fait" | "refuse";
  message: string;
}

/**
 * Les trois gestes des réglages, derrière un seul formulaire.
 *
 * Enregistrer, tester et oublier partagent le même état de retour parce qu'ils
 * partagent la même ligne de statut : deux réducteurs auraient produit deux
 * messages concurrents sous le même bouton.
 */
export async function appliquerReglages(
  _precedent: RetourReglages,
  donnees: FormData,
): Promise<RetourReglages> {
  const intention = String(donnees.get("intention") ?? "enregistrer");
  if (intention === "tester") return tester();
  if (intention === "oublier") return oublier();
  return enregistrer(donnees);
}

/**
 * Un champ de clé vide ne l'efface pas.
 *
 * L'écran ne connaît jamais la clé en clair : un envoi vide veut donc dire
 * « je n'y touche pas », et non « retire-la ». C'est « Oublier la clé » qui
 * retire, et lui seul — sinon un simple changement de modèle effacerait la clé.
 */
function enregistrer(donnees: FormData): RetourReglages {
  const cleApi = String(donnees.get("cleApi") ?? "").trim();
  const modele = String(donnees.get("modele") ?? "");

  const partiel: Partial<{ cleApi: string; modele: Modele; verifieeLe: string }> = {};
  if (cleApi !== "") {
    partiel.cleApi = cleApi;
    // Une clé neuve n'a pas été vérifiée : garder l'ancienne date mentirait.
    partiel.verifieeLe = "";
  }
  if (estModele(modele)) partiel.modele = modele;

  ecrireConfig(partiel);
  revalidatePath("/reglages");
  return { etat: "fait", message: "enregistré dans ~/.orcha/config.json" };
}

async function tester(): Promise<RetourReglages> {
  try {
    await verifierCle(lireConfig().cleApi);
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Échec." };
  }

  ecrireConfig({ verifieeLe: new Date().toISOString() });
  revalidatePath("/reglages");
  return { etat: "fait", message: "clé valide" };
}

function oublier(): RetourReglages {
  ecrireConfig({ cleApi: "", verifieeLe: "" });
  revalidatePath("/reglages");
  return { etat: "fait", message: "clé retirée — le panneau Claude est désactivé" };
}

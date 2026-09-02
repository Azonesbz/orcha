"use server";

import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { creerCommande } from "@/lib/ecriture/commande";
import type { Portee } from "@/lib/ecriture/garde";

export interface RetourCreation {
  etat: "vierge" | "fait" | "refuse";
  message: string;
}

/**
 * Créer une commande depuis la liste.
 *
 * Le verrou d'écriture vit ici et non dans le bouton : griser un contrôle
 * n'empêche personne d'appeler l'action. Les trois refus de `lib/ecriture`
 * restent en dessous — hors des racines connues, dans un plugin, ou par-dessus
 * un fichier qui existe déjà.
 */
export async function creer(_precedent: RetourCreation, formulaire: FormData): Promise<RetourCreation> {
  if (!(await ecritureOuverte())) {
    return { etat: "refuse", message: "L'écriture est fermée sur ce déploiement." };
  }

  try {
    const chemin = creerCommande(String(formulaire.get("portee") ?? "utilisateur") as Portee, {
      nom: String(formulaire.get("nom") ?? ""),
      description: String(formulaire.get("description") ?? ""),
      indiceArgument: String(formulaire.get("indice") ?? ""),
    });
    revalidatePath("/", "layout");
    return { etat: "fait", message: `Commande créée : ${chemin}` };
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
}

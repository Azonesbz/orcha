"use server";

import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { convertir } from "@/lib/ecriture/codex/convertir";

export interface RetourConversion {
  etat: "vierge" | "fait" | "refuse";
  message: string;
}

/**
 * Convertir une portée du `.claude` vers le `.codex`.
 *
 * Le verrou d'écriture vit ici, pas dans le bouton. En dessous, le convertisseur
 * n'écrase jamais rien : ce que le plan a montré « déjà là » le reste.
 */
export async function lancerConversion(
  _precedent: RetourConversion,
  formulaire: FormData,
): Promise<RetourConversion> {
  if (!(await ecritureOuverte())) {
    return { etat: "refuse", message: "L'écriture est fermée sur ce déploiement." };
  }

  const portee = formulaire.get("portee") === "projet" ? "projet" : "utilisateur";
  try {
    const bilan = convertir(portee);
    revalidatePath("/codex");
    return {
      etat: "fait",
      message: `${bilan.ecrits.length} écrit(s) · ${bilan.laisses} déjà là · ${bilan.sansEquivalent} sans équivalent`,
    };
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
}

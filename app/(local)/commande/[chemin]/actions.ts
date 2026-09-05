"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { retirerCommande } from "@/lib/ecriture/commande";

/** Ce que rend un retrait : rien à dire quand il aboutit, l'écran change. */
export interface RetourRetrait {
  message: string;
}

/**
 * Retirer la commande regardée.
 *
 * Le fichier n'est pas effacé : il part dans `retirees/`, hors de `commands/`.
 * La redirection est hors du `try` — `redirect` signale par une exception, que
 * l'attraper transformerait en « Refusé » alors que l'écriture a eu lieu.
 */
export async function retirer(_precedent: RetourRetrait, formulaire: FormData): Promise<RetourRetrait> {
  if (!(await ecritureOuverte())) {
    return { message: "L'écriture est fermée sur ce déploiement. La lecture reste entière." };
  }
  try {
    retirerCommande(String(formulaire.get("chemin") ?? ""));
  } catch (erreur) {
    return { message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
  revalidatePath("/", "layout");
  redirect("/agents");
}

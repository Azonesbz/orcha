"use server";

import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { installerVeille } from "@/lib/ecriture/veille";

export interface RetourVeille {
  etat: "vierge" | "fait" | "refuse";
  message: string;
}

/**
 * Installe le hook dans `~/.claude/hooks/orcha/` et le déclare.
 *
 * Le dossier source est celui du paquet, résolu au serveur : le navigateur n'a
 * pas à connaître — ni à pouvoir choisir — un chemin sur le disque.
 */
export async function installer(
  _precedent: RetourVeille,
  _donnees: FormData,
): Promise<RetourVeille> {
  if (!(await ecritureOuverte())) {
    return { etat: "refuse", message: "L'écriture est fermée sur ce déploiement." };
  }

  try {
    const fait = installerVeille(process.cwd());
    revalidatePath("/veille");
    revalidatePath("/");
    return { etat: "fait", message: `installé dans ${fait.chemin}` };
  } catch (erreur) {
    return {
      etat: "refuse",
      message: erreur instanceof Error ? erreur.message : "Installation refusée.",
    };
  }
}

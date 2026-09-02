"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { demanderProposition } from "@/lib/claude/proposition";
import { enregistrerCommande, retirerCommande } from "@/lib/ecriture/commande";
import { lireConfig } from "@/lib/reglages/config";
import { estModele } from "@/lib/reglages/modeles";
import type { Retour } from "@/components/editeur/Editeur";

/**
 * Les gestes de l'éditeur de commande.
 *
 * Même forme que ceux du sous-agent, autre écrivain : une commande n'a ni
 * modèle ni outils dans son en-tête, et son garde-fou vérifie qu'on est bien
 * dans un dossier `commands/`.
 */
export async function agir(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  const intention = String(formulaire.get("intention") ?? "");
  if (intention === "rejeter") return { etat: "vierge", message: "", proposition: "" };
  if (intention === "appliquer") return appliquer(formulaire);
  return proposer(formulaire);
}

async function proposer(formulaire: FormData): Promise<Retour> {
  const modele = String(formulaire.get("modele") ?? "");
  try {
    const proposition = await demanderProposition({
      instruction: String(formulaire.get("instruction") ?? ""),
      corps: String(formulaire.get("corps") ?? ""),
      sorte: "commande",
      nom: String(formulaire.get("nom") ?? ""),
      modele: estModele(modele) ? modele : lireConfig().modele,
    });
    return { etat: "propose", message: "", proposition };
  } catch (erreur) {
    return {
      etat: "refuse",
      message: erreur instanceof Error ? erreur.message : "Échec de l'appel à Claude.",
      proposition: "",
    };
  }
}

async function appliquer(formulaire: FormData): Promise<Retour> {
  if (!(await ecritureOuverte())) {
    return {
      etat: "refuse",
      message: "L'écriture est fermée sur ce déploiement. La lecture reste entière.",
      proposition: "",
    };
  }

  const corps = String(formulaire.get("proposition") ?? "");
  if (corps.trim() === "") {
    return { etat: "refuse", message: "Rien à appliquer.", proposition: "" };
  }

  try {
    enregistrerCommande(String(formulaire.get("chemin") ?? ""), { corps });
    revalidatePath("/", "layout");
    return { etat: "applique", message: "écrit sur le disque", proposition: "" };
  } catch (erreur) {
    return {
      etat: "refuse",
      message: erreur instanceof Error ? erreur.message : "Refusé.",
      proposition: corps,
    };
  }
}

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

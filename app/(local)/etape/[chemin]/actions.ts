"use server";

import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { demanderProposition } from "@/lib/claude/proposition";
import { enregistrerEtape } from "@/lib/ecriture/etape";
import { lireConfig } from "@/lib/reglages/config";
import { estModele } from "@/lib/reglages/modeles";
import type { Retour } from "@/components/editeur/Editeur";

/**
 * Les trois gestes de l'éditeur d'étape.
 *
 * Même écran que la compétence et le sous-agent, mais un écrivain différent :
 * une étape est du markdown nu, sans frontmatter — le corps EST le fichier.
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
      sorte: "compétence",
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
    enregistrerEtape(String(formulaire.get("chemin") ?? ""), { corps });
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

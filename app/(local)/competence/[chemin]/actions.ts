"use server";

import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { demanderProposition } from "@/lib/claude/proposition";
import { enregistrerCompetence } from "@/lib/ecriture/competence";
import { lireConfig } from "@/lib/reglages/config";
import { estModele } from "@/lib/reglages/modeles";
import type { Retour } from "@/components/editeur/Editeur";

/**
 * Demander une proposition à Claude. Rien n'est écrit ici.
 *
 * L'appel rend le corps entier ; l'écran en déduit les blocs par comparaison,
 * et n'écrit qu'à l'application.
 */
/**
 * Les trois gestes de l'éditeur, derrière un seul formulaire.
 *
 * Proposer, appliquer et rejeter partagent le même état parce qu'ils
 * partagent la même proposition : deux réducteurs auraient laissé un panneau
 * afficher un diff que l'autre venait d'écrire.
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

/**
 * Écrire la proposition sur le disque — le seul chemin d'écriture de l'éditeur.
 *
 * Le verrou est ici et pas dans l'interface : un bouton grisé n'empêche pas
 * d'appeler l'action. Le frontmatter n'est pas touché : `remplacerCorps`
 * réécrit ce qui suit le second `---`, et rien d'autre.
 */
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
    enregistrerCompetence(String(formulaire.get("chemin") ?? ""), { corps });
    revalidatePath("/", "layout");
    return { etat: "applique", message: "écrit dans SKILL.md", proposition: "" };
  } catch (erreur) {
    return {
      etat: "refuse",
      message: erreur instanceof Error ? erreur.message : "Refusé.",
      proposition: corps,
    };
  }
}

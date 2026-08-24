"use server";

import { revalidatePath } from "next/cache";
import { ecritureOuverte } from "@/lib/acces/etat";
import { brancherAgent, creerAgent, debrancherAgent } from "@/lib/ecriture/agent";
import { ajouterEtape, decrireRetrait, retirerEtape } from "@/lib/ecriture/etape";
import {
  appliquerRenumerotation,
  empreinteDuPlan,
  planifierRenumerotation,
  type PlanRenumerotation,
} from "@/lib/ecriture/renumerotation";
import type { Portee } from "@/lib/ecriture/garde";
import { lireAtelier } from "@/lib/lecture/atelier";
import { lireWorkflow } from "@/lib/lecture/workflow";

export interface Retour {
  etat: "vierge" | "fait" | "refuse";
  message: string;
  /** Le détail ligne à ligne, pour ce qui se montre avant de s'écrire. */
  details?: string[];
  /**
   * Le jeton qui lie ce qui est montré à ce qui sera écrit.
   *
   * Reposté au second clic, il fait refuser l'écriture si les fichiers ont
   * bougé entre-temps. Sans lui, « ça se montre avant de s'écrire » était une
   * promesse invérifiable : les deux clics relisent le disque séparément.
   */
  empreinte?: string;
}

/** Relit le workflow depuis le disque : l'état du formulaire ne fait pas foi. */
function relire(cheminSkill: string) {
  const atelier = lireAtelier();
  const competence = atelier.competences.find((c) => c.chemin === cheminSkill);
  if (!competence) throw new Error("Compétence introuvable.");
  const workflow = lireWorkflow(competence.chemin, competence.corps, {
    agents: atelier.agents.map((a) => a.nom),
    competences: atelier.competences.map((c) => c.nom),
  });
  if (!workflow) throw new Error("Cette compétence n'a pas de tableau d'étapes.");
  return workflow;
}


/**
 * Le verrou d'écriture.
 *
 * Il vit ici, dans l'action serveur, et non dans l'interface : griser un bouton
 * n'empêche personne d'appeler l'action directement. Toute écriture y passe.
 */
async function exigerLaLicence(): Promise<void> {
  if (await ecritureOuverte()) return;
  throw new Error(
    "L'écriture demande un compte et un achat. La lecture reste entière — voir la page Compte.",
  );
}

function aboutir(action: () => string): Retour {
  try {
    const message = action();
    revalidatePath("/", "layout");
    return { etat: "fait", message };
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
}

export async function ajouter(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  try {
    await exigerLaLicence();
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
  return aboutir(() => {
    const cheminSkill = String(formulaire.get("skill") ?? "");
    const ecrit = ajouterEtape(cheminSkill, relire(cheminSkill), {
      titre: String(formulaire.get("titre") ?? ""),
      sortieAttendue: String(formulaire.get("sortie") ?? ""),
    });
    return `Étape créée : ${ecrit.split("/").slice(-2).join("/")}`;
  });
}

export async function brancher(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  try {
    await exigerLaLicence();
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
  return aboutir(() => {
    const resultat = brancherAgent(
      String(formulaire.get("etape") ?? ""),
      String(formulaire.get("agent") ?? ""),
    );
    return resultat === "ajoute"
      ? "Branché dans la section Sous-agents."
      : "Déjà nommé dans cette étape — rien n'a été écrit.";
  });
}

export async function creer(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  try {
    await exigerLaLicence();
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
  return aboutir(() => {
    const chemin = creerAgent(String(formulaire.get("portee") ?? "utilisateur") as Portee, {
      nom: String(formulaire.get("nom") ?? ""),
      description: String(formulaire.get("description") ?? ""),
      outils: String(formulaire.get("outils") ?? ""),
      modele: String(formulaire.get("modele") ?? ""),
    });
    return `Agent créé : ${chemin}`;
  });
}

export async function debrancher(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  try {
    await exigerLaLicence();
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
  return aboutir(() => {
    const resultat = debrancherAgent(
      String(formulaire.get("etape") ?? ""),
      String(formulaire.get("agent") ?? ""),
    );
    if (resultat === "retire") return "Retiré de la section Sous-agents.";
    if (resultat === "absent") return "Cet agent n'était pas branché sur cette étape.";
    return (
      "Nommé dans le corps de l'étape, pas dans la section Sous-agents. " +
      "Le retirer voudrait dire réécrire une phrase — à faire à la main."
    );
  });
}

export async function verifierRetrait(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  const cheminSkill = String(formulaire.get("skill") ?? "");
  const numero = String(formulaire.get("numero") ?? "");
  if (!numero) return { etat: "refuse", message: "Choisis d'abord l'étape à retirer." };
  try {
    const d = decrireRetrait(cheminSkill, relire(cheminSkill), numero);
    return {
      etat: "fait",
      message: `Étape ${d.numero} — ${d.role}. Rien n'est encore écrit.`,
      details: [
        `ligne retirée du tableau :  ${d.ligneTableau}`,
        `fichier déplacé depuis   :  ${d.source}`,
        `vers                     :  ${d.destination ?? "(le fichier est déjà absent)"}`,
      ],
      empreinte: d.empreinte,
    };
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
}

export async function retirer(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  try {
    await exigerLaLicence();
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
  return aboutir(() => {
    const cheminSkill = String(formulaire.get("skill") ?? "");
    const numero = String(formulaire.get("numero") ?? "");
    if (!numero) throw new Error("Choisis d'abord l'étape à retirer.");
    const destination = retirerEtape(
      cheminSkill,
      relire(cheminSkill),
      numero,
      String(formulaire.get("empreinte") ?? "") || undefined,
    );
    return destination
      ? `Retirée. Le fichier est dans ${destination.split("/").slice(-2).join("/")}.`
      : "Ligne retirée du tableau. Le fichier était déjà absent.";
  });
}

/**
 * L'aperçu et l'application sont deux actions, pas deux modes.
 *
 * Un bouton qui porte `formAction` ne peut pas porter de `name` : React s'en
 * sert pour encoder l'action à appeler. Deux actions distinctes, donc — et ça
 * se lit mieux : l'une montre, l'autre écrit.
 */
function rendre(plan: PlanRenumerotation, ecrit: boolean): Retour {
  const jeton = empreinteDuPlan(plan);
  if (plan.deplacements.length === 0) {
    return { etat: "fait", message: "La numérotation est déjà continue : rien à faire." };
  }
  const renommages = plan.deplacements.map((d) => `${d.ancienRelatif} → ${d.nouveauRelatif}`);
  const lignes = plan.occurrences.map(
    (o) => `${o.fichier.split("/").slice(-1)[0]}:${o.ligne}  ${o.avant.trim()}  →  ${o.apres.trim()}`,
  );
  return {
    etat: "fait",
    message: ecrit
      ? `${plan.deplacements.length} étapes renumérotées, ${plan.occurrences.length} lignes réécrites.`
      : `${plan.deplacements.length} étapes à renuméroter, ${plan.occurrences.length} lignes à réécrire. Rien n'est encore écrit.`,
    details: [...renommages, ...lignes],
    empreinte: jeton,
  };
}

/**
 * Réordonner les étapes, depuis le plan.
 *
 * Le glisser dans l'écran ne fait que produire un ordre ; tout le reste est la
 * renumérotation qui existait déjà — renommer les fichiers, réécrire le
 * tableau, suivre les renvois que les étapes se font entre elles. On ne
 * réinvente rien, on lui passe l'ordre voulu.
 */
export async function reordonner(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  try {
    await exigerLaLicence();
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }

  const cheminSkill = String(formulaire.get("skill") ?? "");
  const ordre = String(formulaire.get("ordre") ?? "").split(",").filter(Boolean);
  if (ordre.length === 0) return { etat: "refuse", message: "Aucun ordre reçu." };

  try {
    const plan = appliquerRenumerotation(cheminSkill, relire(cheminSkill), undefined, ordre);
    revalidatePath("/", "layout");
    return rendre(plan, true);
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
}

export async function apercuRenumerotation(_precedent: Retour, formulaire: FormData): Promise<Retour> {
  const cheminSkill = String(formulaire.get("skill") ?? "");
  try {
    return rendre(planifierRenumerotation(cheminSkill, relire(cheminSkill)), false);
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
}

export async function appliquerRenumerotationAction(
  _precedent: Retour,
  formulaire: FormData,
): Promise<Retour> {
  try {
    await exigerLaLicence();
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
  const cheminSkill = String(formulaire.get("skill") ?? "");
  try {
    const plan = appliquerRenumerotation(
      cheminSkill,
      relire(cheminSkill),
      String(formulaire.get("empreinte") ?? "") || undefined,
    );
    revalidatePath("/", "layout");
    return rendre(plan, true);
  } catch (erreur) {
    return { etat: "refuse", message: erreur instanceof Error ? erreur.message : "Refusé." };
  }
}

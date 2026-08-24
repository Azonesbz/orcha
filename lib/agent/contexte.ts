/**
 * Ce que l'agent sait de l'écran d'où on l'appelle.
 *
 * Le contexte se déduit de la route plutôt que de descendre en props : la
 * coquille locale ne peut pas recevoir le contexte des pages, et le recalculer
 * ici — côté serveur, là où les lecteurs vivent déjà — évite de faire voyager
 * l'inventaire deux fois.
 *
 * `dossier` n'est pas décoratif : c'est le périmètre passé à `--add-dir`, et
 * celui dont on prend un instantané avant d'écrire. Le borner au dossier d'une
 * compétence plutôt qu'à `.claude` entier évite de copier le cache des plugins.
 */

import { dirname, join } from "node:path";
import { lireAtelier } from "../lecture/atelier.ts";
import { lireTexte, racineUtilisateur } from "../lecture/fichiers.ts";
import { lireWorkflow } from "../lecture/workflow.ts";
import { resumer } from "../resume.ts";
import type { Atelier } from "../types.ts";

export interface Contexte {
  titre: string;
  /** Ce qu'on donne à lire à l'agent, en clair. */
  resume: string;
  /** Le périmètre `.claude` : c'est de lui qu'on prend un instantané. */
  dossier: string;
  /**
   * Le dépôt auquel ce `.claude` appartient, s'il y en a un.
   *
   * Sans lui, un agent ne peut rien faire du code qu'il est censé servir :
   * ouvrir une branche, lancer les tests, poser une pull request. Il n'est PAS
   * couvert par l'instantané — un dépôt a git pour filet, et le dupliquer
   * copierait `node_modules`.
   */
  projet?: string;
  /** Faux sur un plugin, ou sur un fichier qu'on n'a pas trouvé. */
  peutEcrire: boolean;
  suggestions: string[];
}

const GENERALES = ["Qu'est-ce qui est déclaré mais ne charge pas ?"];

/** Le dépôt qui contient ce `.claude`, c'est-à-dire son dossier parent. */
function projetDe(atelier: Atelier): string | undefined {
  if (!atelier.racineProjet) return undefined;
  return dirname(atelier.racineProjet);
}

export function contexteDe(chemin: string): Contexte {
  const atelier = lireAtelier();
  const [, section, encode] = chemin.split("/");
  const cible = encode ? decodeURIComponent(encode) : "";
  const projet = projetDe(atelier);

  if (section === "workflow" && cible) return { ...duWorkflow(atelier, cible), projet };
  if (["competence", "agent", "etape"].includes(section) && cible) {
    return { ...duFichier(atelier, cible), projet };
  }
  return { ...deLaSection(atelier, section ?? ""), projet };
}

function duWorkflow(atelier: Atelier, cheminSkill: string): Contexte {
  const competence = atelier.competences.find((c) => c.chemin === cheminSkill);
  if (!competence) return deLaSection(atelier, "workflows");

  const workflow = lireWorkflow(competence.chemin, competence.corps, resolveur(atelier));
  const etapes = (workflow?.etapes ?? [])
    .map(
      (e) =>
        `  ${e.numero}. ${e.role} — ${e.fichierDeclare}` +
        `${e.present ? "" : " (FICHIER ABSENT)"}${e.arretDur ? " [arrêt dur]" : ""}` +
        `${e.agents.length ? ` appelle : ${e.agents.join(", ")}` : ""}`,
    )
    .join("\n");

  return {
    titre: `Plan du workflow ${competence.nom}`,
    resume: [
      `Workflow « ${competence.nom} », déclaré dans ${competence.chemin}.`,
      `Portée : ${competence.portee}. ${workflow?.etapes.length ?? 0} étapes.`,
      "",
      "Séquence :",
      etapes || "  (aucune étape)",
      workflow?.orphelins.length
        ? `\nFichiers hors séquence, jamais lus : ${workflow.orphelins.join(", ")}`
        : "",
    ].join("\n"),
    dossier: dirname(competence.chemin),
    peutEcrire: modifiable(competence.portee, competence.chemin),
    suggestions: [
      "Audite ce workflow : qu'est-ce qui pourrait être amélioré ?",
      "Ajoute une étape qui ",
    ],
  };
}

function duFichier(atelier: Atelier, chemin: string): Contexte {
  const contenu = lireTexte(chemin);
  const nom = chemin.slice(chemin.lastIndexOf("/") + 1);
  if (contenu === null) {
    return { ...deLaSection(atelier, ""), titre: `Fichier ${nom}`, peutEcrire: false };
  }

  return {
    titre: nom,
    resume: [`Fichier ${chemin} :`, "", contenu].join("\n"),
    dossier: dirname(chemin),
    peutEcrire: modifiable(porteeDe(chemin), chemin),
    suggestions: ["Resserre ce fichier sans rien perdre de son sens.", "Qu'est-ce qui manque ici ?"],
  };
}

/**
 * Le périmètre d'un écran de section, et ce qu'on y autorise.
 *
 * Deux choses se décident ensemble parce qu'elles sont la même : ce que
 * l'agent peut écrire, et ce dont on prend un instantané avant qu'il écrive.
 * Donner `~/.claude` entier revenait à copier `projects/` — des centaines de
 * méga-octets de transcriptions qu'Orcha ne touche jamais. Mesuré avant
 * correction : 925 Mo d'instantanés pour dix-sept questions.
 *
 * Un écran de lecture — tableau de bord, réglages, veille — n'écrit rien : il
 * garde la racine pour pouvoir TOUT lire, et n'a pas d'instantané à prendre.
 */
function perimetre(section: string): { dossier: string; peutEcrire: boolean } {
  const racine = racineUtilisateur();
  if (section === "competences" || section === "workflows") {
    return { dossier: join(racine, "skills"), peutEcrire: true };
  }
  if (section === "agents") return { dossier: join(racine, "agents"), peutEcrire: true };
  return { dossier: racine, peutEcrire: false };
}

function deLaSection(atelier: Atelier, section: string): Contexte {
  const avec = resumer(atelier, true);
  const commun = perimetre(section);

  if (section === "workflows") {
    return {
      ...commun,
      titre: "Les workflows",
      resume: listeDesWorkflows(atelier),
      suggestions: ["Crée un workflow qui ", "Lequel de ces workflows a des étapes mortes ?"],
    };
  }
  if (section === "competences" || section === "agents") {
    return {
      ...commun,
      titre: section === "agents" ? "Agents et commandes" : "Les compétences",
      resume: inventaire(atelier, section),
      suggestions: ["Quelles descriptions se recouvrent au point de se gêner ?", ...GENERALES],
    };
  }

  return {
    ...commun,
    titre: "Vue d'ensemble",
    resume: [
      `Atelier lu : ${atelier.racineUtilisateur}${atelier.racineProjet ? ` et ${atelier.racineProjet}` : ""}.`,
      `${avec.competences} compétences, ${avec.agents} agents, ${avec.commandes} commandes, ${avec.workflows} workflows.`,
      avec.ecarts.length
        ? `\nÉcarts :\n${avec.ecarts.map((e) => `  ${e.quoi} — ${e.cause} (${e.ou})`).join("\n")}`
        : "\nAucun écart : tout ce qui est déclaré charge.",
    ].join("\n"),
    suggestions: [...GENERALES, "Par quoi je devrais commencer pour faire le ménage ?"],
  };
}

function listeDesWorkflows(atelier: Atelier): string {
  const lignes = atelier.competences
    .map((c) => ({ c, w: lireWorkflow(c.chemin, c.corps, resolveur(atelier)) }))
    .filter((x) => x.w !== null)
    .map(({ c, w }) => `  ${c.nom} (${c.portee}) — ${w!.etapes.length} étapes — ${c.chemin}`);
  return ["Workflows déclarés :", ...(lignes.length ? lignes : ["  (aucun)"])].join("\n");
}

function inventaire(atelier: Atelier, section: string): string {
  const elements =
    section === "agents"
      ? [...atelier.agents, ...atelier.commandes]
      : atelier.competences;
  return [
    `${elements.length} éléments :`,
    ...elements.map((e) => `  ${e.nom} (${e.portee}) — ${e.description} — ${e.chemin}`),
  ].join("\n");
}

/**
 * Un plugin ne s'écrit pas.
 *
 * C'est un clone de dépôt que la machine ne possède pas : toute modification y
 * serait écrasée au prochain `claude plugin update`, en silence. Même règle que
 * `cheminModifiable`, appliquée ici pour décider ce qu'on autorise à l'agent.
 */
function modifiable(portee: string, chemin: string): boolean {
  if (portee === "plugin" || portee === "intégré") return false;
  return !chemin.includes("/plugins/marketplaces/") && !chemin.includes("/plugins/cache/");
}

function porteeDe(chemin: string): string {
  return chemin.includes("/plugins/") ? "plugin" : "utilisateur";
}

function resolveur(atelier: Atelier) {
  return {
    agents: atelier.agents.map((a) => a.nom),
    competences: atelier.competences.map((c) => c.nom),
  };
}

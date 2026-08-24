/**
 * L'état du hook de veille, calculé plutôt que documenté.
 *
 * Le bloc à coller contenait un chemin absolu écrit à la main dans le README —
 * juste chez son auteur, faux chez tout le monde. L'application sait où elle a
 * été installée : elle produit donc le bloc exact, pour la machine où elle
 * tourne, et dit s'il est déjà en place.
 *
 * Et quand il n'y est pas, elle dit POURQUOI. « Pas installée » sans raison est
 * exactement le silence contre lequel Orcha existe : un `hooks` mal formé, un
 * settings.json cassé, et le verdict est le même que sur un fichier vierge.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { dossierDInstallation } from "../ecriture/veille.ts";
import { lireTexte, racineUtilisateur } from "./fichiers.ts";

const NOM_DU_HOOK = "hook.py";

export interface Veille {
  /** Le hook livré avec le paquet : la source de la copie. */
  cheminSource: string;
  /** Où la copie vit, ou vivra — dans le dossier de l'utilisateur. */
  cheminInstalle: string;
  /** La copie est-elle sur le disque ? */
  copieEnPlace: boolean;
  /** Le paquet porte-t-il le hook à copier ? Faux = paquet incomplet. */
  sourceDisponible: boolean;
  /** Le bloc JSON à coller à la main, pour qui préfère. */
  bloc: string;
  /** Un SessionStart déclare un hook.py. */
  installe: boolean;
  /** ... mais pas la copie : un chemin de paquet périmé, par exemple. */
  declareAilleurs: boolean;
  /** Un hook SessionStart est déclaré, mais il ne pointe pas sur celui-ci. */
  autreHookPresent: boolean;
  /** Le hook est un script Python. La page publique promet que Node suffit. */
  python: { present: boolean; version: string };
  /** Pourquoi la lecture n'a rien trouvé, quand ce n'est pas « rien n'y est ». */
  raison: string;
  fichierReglages: string;
}

export function lireVeille(): Veille {
  const cheminSource = join(process.cwd(), NOM_DU_HOOK);
  const cheminInstalle = join(dossierDInstallation(), NOM_DU_HOOK);
  const fichierReglages = join(racineUtilisateur(), "settings.json");
  const { commandes, raison } = inspecter(fichierReglages);
  const declarees = commandes.filter((c) => c.includes(NOM_DU_HOOK));

  return {
    cheminSource,
    cheminInstalle,
    copieEnPlace: existsSync(cheminInstalle),
    sourceDisponible: existsSync(cheminSource),
    bloc: blocAColler(cheminInstalle),
    installe: declarees.length > 0,
    declareAilleurs:
      declarees.length > 0 && !declarees.some((c) => c.includes(cheminInstalle)),
    autreHookPresent: commandes.length > 0 && declarees.length === 0,
    python: versionDePython(),
    raison,
    fichierReglages,
  };
}

/**
 * Y a-t-il un `python3` sur cette machine ?
 *
 * Constaté, jamais supposé : le hook est un script Python alors que l'outil se
 * présente comme ne demandant que Node. Sans cette vérification, l'installation
 * réussit et le hook échoue à chaque session — le silence exact qu'Orcha existe
 * pour rompre.
 */
function versionDePython(): { present: boolean; version: string } {
  try {
    const essai = spawnSync("python3", ["--version"], { encoding: "utf8", timeout: 3000 });
    const sortie = `${essai.stdout ?? ""}${essai.stderr ?? ""}`.trim();
    if (essai.status === 0 && sortie !== "") return { present: true, version: sortie };
  } catch {
    // Un python3 absent lève selon la plateforme au lieu de rendre un statut.
  }
  return { present: false, version: "" };
}

interface Inspection {
  /** Les commandes déclarées sous SessionStart, tous groupes confondus. */
  commandes: string[];
  raison: string;
}

/**
 * Ce que le fichier de réglages déclare, et ce qui l'empêche de le déclarer.
 *
 * La lecture se fait ici et non par `lireJson` : ce dernier rend `{}` sur un
 * fichier illisible comme sur un fichier vide, et c'est précisément la
 * distinction qu'on cherche à rendre.
 */
function inspecter(fichier: string): Inspection {
  const brut = lireTexte(fichier);
  // Pas de fichier, pas d'anomalie : c'est une machine neuve.
  if (brut === null || brut.trim() === "") return { commandes: [], raison: "" };

  let lu: unknown;
  try {
    lu = JSON.parse(brut);
  } catch (erreur) {
    return {
      commandes: [],
      raison: `Ce fichier ne se lit pas comme du JSON (${
        erreur instanceof Error ? erreur.message : "erreur d'analyse"
      }). Corrige-le avant d'y ajouter un hook — en l'état, Claude Code ne le lit pas non plus.`,
    };
  }

  const hooks = (lu as Record<string, unknown> | null)?.hooks;
  if (hooks === undefined) return { commandes: [], raison: "" };

  // Le piège le plus fréquent : le bloc collé un cran trop bas, si bien que
  // `hooks` reçoit l'entrée elle-même au lieu du tableau d'événements.
  if (Array.isArray(hooks)) {
    return {
      commandes: [],
      raison:
        "« hooks » est un tableau, alors que Claude Code attend un objet dont les clés " +
        "sont les événements — « SessionStart », par exemple. Le bloc a été collé un cran " +
        "trop bas : c'est la valeur de « hooks » entière qu'il remplace, pas une entrée.",
    };
  }
  if (typeof hooks !== "object" || hooks === null) {
    return { commandes: [], raison: `« hooks » vaut ${typeof hooks}, alors qu'un objet est attendu.` };
  }

  const groupes = (hooks as Record<string, unknown>).SessionStart;
  if (groupes === undefined) return { commandes: [], raison: "" };
  if (!Array.isArray(groupes)) {
    return {
      commandes: [],
      raison: "« hooks.SessionStart » n'est pas un tableau de groupes, alors qu'il doit en être un.",
    };
  }

  return { commandes: commandesDe(groupes), raison: "" };
}

function commandesDe(groupes: unknown[]): string[] {
  return groupes.flatMap((groupe) => {
    const liste = (groupe as Record<string, unknown>)?.hooks;
    if (!Array.isArray(liste)) return [];
    return liste
      .map((h) => (h as Record<string, unknown>)?.command)
      .filter((c): c is string => typeof c === "string");
  });
}

function blocAColler(chemin: string): string {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: `python3 ${chemin}`, timeout: 10 }] }],
      },
    },
    null,
    2,
  );
}

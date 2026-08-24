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

import { join } from "node:path";
import { lireTexte, racineUtilisateur } from "./fichiers.ts";

const NOM_DU_HOOK = "hook.py";

export interface Veille {
  /** Le chemin absolu du hook sur cette machine. */
  chemin: string;
  /** Le bloc JSON à coller dans settings.json, prêt à l'emploi. */
  bloc: string;
  installe: boolean;
  /** Un hook SessionStart est déclaré, mais il ne pointe pas sur celui-ci. */
  autreHookPresent: boolean;
  /** Pourquoi la lecture n'a rien trouvé, quand ce n'est pas « rien n'y est ». */
  raison: string;
  fichierReglages: string;
}

export function lireVeille(): Veille {
  const chemin = join(process.cwd(), NOM_DU_HOOK);
  const fichierReglages = join(racineUtilisateur(), "settings.json");
  const { commandes, raison } = inspecter(fichierReglages);
  const leNotre = commandes.some((c) => c.includes(NOM_DU_HOOK));

  return {
    chemin,
    bloc: blocAColler(chemin),
    installe: leNotre,
    autreHookPresent: commandes.length > 0 && !leNotre,
    raison,
    fichierReglages,
  };
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

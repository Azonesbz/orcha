/**
 * Installer le hook de veille dans le dossier de l'utilisateur.
 *
 * Le hook vivait jusqu'ici DANS le paquet npm, et l'écran donnait ce chemin à
 * coller. Deux défauts : le chemin d'un paquet `npx` est un cache que npm peut
 * effacer, et il change à chaque mise à jour — un hook déclaré hier cessait de
 * se déclencher aujourd'hui, en silence. La copie vit donc dans
 * `~/.claude/hooks/orcha/`, à côté des réglages qu'elle surveille.
 *
 * `settings.json` est un fichier écrit à la main : on y ajoute une entrée, on
 * ne le réécrit pas. Un hook voisin, un autre événement, une clé sans rapport —
 * tout doit ressortir intact.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { lireTexte, racineUtilisateur } from "../lecture/fichiers.ts";
import { cheminModifiable, EcritureRefusee, ecrireAtomiquement } from "./garde.ts";

/** `hook.py` et les trois modules qu'il importe. Les quatre, ou aucun. */
export const MODULES_DU_HOOK = ["hook.py", "ecart.py", "lecture.py", "message.py"] as const;

const SOUS_DOSSIER = join("hooks", "orcha");

export interface Installation {
  /** Le chemin du hook installé — celui qui part dans la commande. */
  chemin: string;
  fichierReglages: string;
}

export function dossierDInstallation(): string {
  return join(racineUtilisateur(), SOUS_DOSSIER);
}

export function installerVeille(dossierSource: string): Installation {
  const manquants = MODULES_DU_HOOK.filter((n) => !existsSync(join(dossierSource, n)));
  if (manquants.length > 0) {
    throw new EcritureRefusee(
      `Source incomplète : ${manquants.join(", ")} introuvable(s). Un hook amputé d'un de ses ` +
        "modules plante au démarrage de chaque session — mieux vaut ne rien installer.",
    );
  }

  const destination = dossierDInstallation();
  const chemin = join(destination, "hook.py");
  const fichierReglages = join(racineUtilisateur(), "settings.json");

  // Les réglages sont vérifiés AVANT la copie : échouer après avoir écrit des
  // fichiers laisserait une installation à moitié faite, que rien ne signale.
  const reglages = reglagesAvecLeHook(fichierReglages, chemin);

  cheminModifiable(chemin);
  mkdirSync(destination, { recursive: true });
  for (const nom of MODULES_DU_HOOK) {
    copyFileSync(join(dossierSource, nom), join(destination, nom));
  }
  ecrireAtomiquement(fichierReglages, `${JSON.stringify(reglages, null, 2)}\n`);

  return { chemin, fichierReglages };
}

function reglagesAvecLeHook(fichier: string, chemin: string): Record<string, unknown> {
  const reglages = reglagesLus(fichier);
  const entree = { type: "command", command: `python3 ${chemin}`, timeout: 10 };
  const hooks = hooksReparables(reglages);

  const groupes = Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [];
  return {
    ...reglages,
    hooks: { ...hooks, SessionStart: [...sansLeNotre(groupes), { hooks: [entree] }] },
  };
}

function reglagesLus(fichier: string): Record<string, unknown> {
  const brut = lireTexte(fichier);
  if (brut === null || brut.trim() === "") return {};
  try {
    const lu: unknown = JSON.parse(brut);
    if (lu === null || typeof lu !== "object" || Array.isArray(lu)) {
      throw new EcritureRefusee(`${fichier} ne contient pas un objet JSON.`);
    }
    return lu as Record<string, unknown>;
  } catch (erreur) {
    if (erreur instanceof EcritureRefusee) throw erreur;
    throw new EcritureRefusee(
      `${fichier} ne se lit pas comme du JSON : ${erreur instanceof Error ? erreur.message : "?"}. ` +
        "Corrige-le d'abord — en l'état, Claude Code ne le lit pas non plus.",
    );
  }
}

/**
 * La clé `hooks`, ramenée à un objet — ou un refus.
 *
 * Le cas tordu : `hooks` vaut un tableau, parce que le bloc a été collé un cran
 * trop bas. S'il ne contient que notre propre hook, c'est notre dégât et on le
 * répare. S'il contient autre chose, on refuse : écraser une valeur qu'on ne
 * comprend pas perdrait du travail écrit à la main.
 */
function hooksReparables(reglages: Record<string, unknown>): Record<string, unknown> {
  const hooks = reglages.hooks;
  if (hooks === undefined) return {};
  if (hooks !== null && typeof hooks === "object" && !Array.isArray(hooks)) {
    return hooks as Record<string, unknown>;
  }

  const queLeNotre =
    Array.isArray(hooks) &&
    hooks.length > 0 &&
    hooks.every((e) => estNotreEntree(e));
  if (queLeNotre) return {};

  throw new EcritureRefusee(
    "« hooks » n'est pas un objet dans tes réglages, et son contenu ne vient pas d'Orcha. " +
      "Le remplacer perdrait ce qui s'y trouve : remets « hooks » sous la forme " +
      "{ \"SessionStart\": [ … ] }, puis relance l'installation.",
  );
}

function sansLeNotre(groupes: unknown[]): unknown[] {
  return groupes.filter((groupe) => {
    const liste = (groupe as Record<string, unknown>)?.hooks;
    if (!Array.isArray(liste)) return true;
    return !liste.some((e) => estNotreEntree(e));
  });
}

function estNotreEntree(entree: unknown): boolean {
  const commande = (entree as Record<string, unknown>)?.command;
  return typeof commande === "string" && commande.includes("hook.py");
}

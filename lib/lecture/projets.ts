/**
 * Les projets où Claude Code a réellement travaillé.
 *
 * `~/.claude/projects/` contient un dossier par projet, nommé d'après son
 * chemin avec les séparateurs remplacés par des tirets. Ce nom est
 * **irréversible** : `-Users-vins-workspace-bpm-connect` peut se lire
 * `workspace/bpm/connect` comme `workspace/bpm-connect`, et c'est la seconde
 * qui est vraie ici. On ne décode donc pas le nom.
 *
 * Les transcriptions, elles, portent un champ `cwd` : c'est la source, et elle
 * ne se devine pas.
 */

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { estDossier, listerDossiers, listerFichiers, racineUtilisateur } from "./fichiers.ts";

/** Au-delà, on renonce : le `cwd` apparaît dans les toutes premières lignes. */
const LIGNES_SONDEES = 40;

export interface ProjetConnu {
  chemin: string;
  /** Dernière trace d'activité, pour présenter le plus récent en premier. */
  vuLe: number;
  aUnDossierClaude: boolean;
}

export function listerProjetsConnus(): ProjetConnu[] {
  const dossier = join(racineUtilisateur(), "projects");
  if (!estDossier(dossier)) return [];

  const parChemin = new Map<string, ProjetConnu>();

  for (const nom of listerDossiers(dossier)) {
    const trace = join(dossier, nom);
    const trouve = cheminDepuisLesTranscriptions(trace);
    if (!trouve) continue;

    const connu = parChemin.get(trouve.chemin);
    if (!connu || trouve.vuLe > connu.vuLe) {
      parChemin.set(trouve.chemin, {
        chemin: trouve.chemin,
        vuLe: trouve.vuLe,
        aUnDossierClaude: estDossier(join(trouve.chemin, ".claude")),
      });
    }
  }

  return [...parChemin.values()]
    .filter((p) => p.aUnDossierClaude)
    .sort((a, b) => b.vuLe - a.vuLe);
}

/**
 * Les dossiers de traces d'un projet donné.
 *
 * Il peut y en avoir plusieurs : le nom du dossier vient du chemin, et un même
 * projet atteint par deux chemins équivalents laisse deux traces. On compare
 * les `cwd`, jamais les noms — ils ne se décodent pas.
 */
export function tracesDuProjet(cheminProjet: string): string[] {
  const dossier = join(racineUtilisateur(), "projects");
  if (!estDossier(dossier)) return [];

  return listerDossiers(dossier)
    .map((nom) => join(dossier, nom))
    .filter((trace) => cheminDepuisLesTranscriptions(trace)?.chemin === cheminProjet);
}

/** Le `cwd` de la transcription la plus récente, et sa date. */
function cheminDepuisLesTranscriptions(trace: string): { chemin: string; vuLe: number } | null {
  const fichiers = listerFichiers(trace, ".jsonl")
    .map((nom) => join(trace, nom))
    .map((chemin) => ({ chemin, vuLe: dateDe(chemin) }))
    .sort((a, b) => b.vuLe - a.vuLe);

  for (const { chemin, vuLe } of fichiers) {
    const cwd = premierCwd(chemin);
    if (cwd) return { chemin: cwd, vuLe };
  }
  return null;
}

function premierCwd(fichier: string): string | null {
  let brut: string;
  try {
    brut = readFileSync(fichier, "utf8");
  } catch {
    return null;
  }

  for (const ligne of brut.split("\n", LIGNES_SONDEES)) {
    if (!ligne.includes('"cwd"')) continue;
    try {
      const valeur = (JSON.parse(ligne) as Record<string, unknown>).cwd;
      if (typeof valeur === "string" && valeur.startsWith("/")) return valeur;
    } catch {
      // Une ligne tronquée n'empêche pas de lire les suivantes.
    }
  }
  return null;
}

function dateDe(chemin: string): number {
  try {
    return statSync(chemin).mtimeMs;
  } catch {
    return 0;
  }
}

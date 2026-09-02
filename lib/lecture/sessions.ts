/**
 * Retrouver les séances d'un projet, et ne pas les relire pour rien.
 *
 * `deroule.ts` sait lire *une* transcription ; ici on dit lesquelles. Vingt-
 * quatre sessions d'un seul projet pèsent 162 Mo : on n'ouvre que les plus
 * récentes, et on garde le résultat tant que le fichier n'a pas bougé — même
 * cache par `mtime` que le reste des lectures disque.
 */

import { statSync } from "node:fs";
import { join } from "node:path";
import { listerFichiers } from "./fichiers.ts";
import { lireSession, type Session } from "./deroule.ts";
import { tracesDuProjet } from "./projets.ts";

/** Assez pour voir une dérive d'une semaine sur l'autre, sans ouvrir l'historique. */
export const SESSIONS_PAR_DEFAUT = 12;

const cache = new Map<string, { vuLe: number; session: Session }>();

/** Les séances les plus récentes du projet, de la plus récente à la plus ancienne. */
export function listerSessions(cheminProjet: string, maximum = SESSIONS_PAR_DEFAUT): Session[] {
  return tracesDuProjet(cheminProjet)
    .flatMap((trace) => listerFichiers(trace, ".jsonl").map((nom) => join(trace, nom)))
    .map((chemin) => ({ chemin, vuLe: dateDe(chemin) }))
    .sort((a, b) => b.vuLe - a.vuLe)
    .slice(0, maximum)
    .map(({ chemin, vuLe }) => relire(chemin, vuLe))
    .filter((session): session is Session => session !== null);
}

/** Combien de séances existent en tout — pour dire ce qu'on n'a pas ouvert. */
export function compterSessions(cheminProjet: string): number {
  return tracesDuProjet(cheminProjet).reduce((total, trace) => total + listerFichiers(trace, ".jsonl").length, 0);
}

function relire(chemin: string, vuLe: number): Session | null {
  const garde = cache.get(chemin);
  if (garde && garde.vuLe === vuLe) return garde.session;

  const session = lireSession(chemin);
  if (session) cache.set(chemin, { vuLe, session });
  return session;
}

function dateDe(chemin: string): number {
  try {
    return statSync(chemin).mtimeMs;
  } catch {
    return 0;
  }
}

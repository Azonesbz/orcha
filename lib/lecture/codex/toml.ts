/**
 * Lire un TOML sans lever.
 *
 * Trois issues, et la lecture doit les distinguer : le fichier n'est pas là
 * (situation normale), il se lit, ou il ne se lit pas — et alors on garde le
 * message, parce que « illisible » sans raison est le silence même qu'Orcha
 * existe pour rompre.
 */

import { parse } from "smol-toml";
import { lireTexte } from "../fichiers.ts";

export interface Toml {
  valeur: Record<string, unknown>;
  erreur: string | null;
  absent: boolean;
}

export function lireToml(chemin: string): Toml {
  const brut = lireTexte(chemin);
  if (brut === null) return { valeur: {}, erreur: null, absent: true };
  try {
    return { valeur: parse(brut) as Record<string, unknown>, erreur: null, absent: false };
  } catch (erreur) {
    return {
      valeur: {},
      erreur: erreur instanceof Error ? erreur.message.split("\n")[0] : "TOML illisible",
      absent: false,
    };
  }
}

export function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

/** Un sous-objet, ou rien : un TOML met des tables partout, on ne les suppose jamais. */
export function table(valeur: unknown): Record<string, unknown> {
  return valeur !== null && typeof valeur === "object" && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {};
}

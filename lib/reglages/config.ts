/**
 * La configuration d'Orcha : `~/.orcha/config.json`.
 *
 * Elle ne contient que ce qui ne peut pas être lu du disque — aujourd'hui, la
 * clé d'API et le modèle par défaut. Tout le reste est déduit des dossiers
 * `.claude`, et n'a pas à être configuré.
 *
 * La clé ne quitte jamais cette machine : elle n'est écrite que dans ce
 * fichier, en 0600, et n'est envoyée qu'à l'API Anthropic. Une lecture d'Orcha
 * ne dépend jamais d'elle — un fichier absent ou abîmé rend les valeurs par
 * défaut plutôt qu'une erreur.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { estModele, MODELES, type Modele } from "./modeles.ts";

export { MODELES, type Modele };

export interface Config {
  cleApi: string;
  modele: Modele;
  /** Quand « Tester la connexion » a réussi, en ISO. Vide si jamais vérifiée. */
  verifieeLe: string;
}

export const CONFIG_PAR_DEFAUT: Config = { cleApi: "", modele: MODELES[0], verifieeLe: "" };

/** `ORCHA_CONFIG` déplace le fichier — les tests s'en servent, pas l'application. */
export function cheminConfig(): string {
  return process.env.ORCHA_CONFIG || join(homedir(), ".orcha", "config.json");
}

export function lireConfig(): Config {
  const brut = lireSansLever(cheminConfig());
  if (brut === null) return CONFIG_PAR_DEFAUT;

  const lu = analyser(brut);
  return {
    cleApi: typeof lu.cleApi === "string" ? lu.cleApi : CONFIG_PAR_DEFAUT.cleApi,
    modele: estModele(lu.modele) ? lu.modele : CONFIG_PAR_DEFAUT.modele,
    verifieeLe: typeof lu.verifieeLe === "string" ? lu.verifieeLe : CONFIG_PAR_DEFAUT.verifieeLe,
  };
}

/** Fusionne : ce qui n'est pas fourni n'est pas touché. */
export function ecrireConfig(partiel: Partial<Config>): void {
  const chemin = cheminConfig();
  const suite = { ...lireConfig(), ...partiel };

  mkdirSync(dirname(chemin), { recursive: true, mode: 0o700 });
  // Par fichier temporaire puis renommage : une lecture concurrente voit
  // l'ancien fichier ou le nouveau, jamais un fichier à moitié écrit.
  const provisoire = `${chemin}.orcha-${process.pid}`;
  writeFileSync(provisoire, `${JSON.stringify(suite, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(provisoire, chemin);
}

/**
 * La clé telle qu'on peut l'afficher sans la révéler.
 *
 * Le préfixe seul ne dit rien — toutes les clés commencent pareil. Ce sont les
 * derniers caractères qui permettent de reconnaître *laquelle* est en place.
 */
export function masquer(cle: string): string {
  if (cle === "") return "";
  return `sk-ant-…${cle.slice(-6)}`;
}

function lireSansLever(chemin: string): string | null {
  try {
    return readFileSync(chemin, "utf8");
  } catch {
    return null;
  }
}

function analyser(brut: string): Record<string, unknown> {
  try {
    const lu: unknown = JSON.parse(brut);
    return lu !== null && typeof lu === "object" ? (lu as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

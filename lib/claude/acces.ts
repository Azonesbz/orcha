/**
 * L'accès à Claude, et ce qu'on en dit quand il manque.
 *
 * Deux voies : le CLI `claude`, donc l'abonnement de la machine — c'est celle
 * de l'agent — et une clé d'API, vérifiée depuis Réglages. Ce module ne fait
 * qu'établir si l'une ou l'autre est là, et traduire leurs refus en une phrase
 * qui dit quoi faire. Il y avait ici une troisième chose, la demande de
 * proposition de l'ancien panneau « Modifier avec Claude » : l'agent l'a
 * remplacée.
 */

import { spawnSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";

export class AccesRefuse extends Error {}

/**
 * Le CLI `claude` est-il installé ?
 *
 * Résolu une fois par processus : c'est un lancement de sous-processus, et la
 * réponse ne change pas en cours de session.
 */
let cliVue: boolean | null = null;
export function cliDisponible(): boolean {
  if (cliVue === null) {
    cliVue = spawnSync("claude", ["--version"], { timeout: 5000 }).status === 0;
  }
  return cliVue;
}

/**
 * Le CLI signale une session morte sur STDOUT, avec un code de retour 0.
 *
 * Sans ce contrôle, « Failed to authenticate » s'affiche comme si c'était la
 * réponse du modèle — un échec déguisé en résultat, exactement ce qu'Orcha
 * existe pour empêcher.
 */
export function refuserSiSessionMorte(sortie: string): void {
  if (/^Failed to authenticate/im.test(sortie)) {
    throw new AccesRefuse(
      "Session Claude Code expirée. Lance `claude` une fois en terminal pour te reconnecter.",
    );
  }
}

export function enClair(erreur: unknown): string {
  if (erreur instanceof AccesRefuse) return erreur.message;
  // Le CLI rend ça sur stdout ET en message d'erreur selon le chemin : le test
  // porte donc sur le texte, pas sur le type.
  if (erreur instanceof Error && /authenticate|OAuth/i.test(erreur.message)) {
    return "Session Claude Code expirée. Lance `claude` une fois en terminal pour te reconnecter.";
  }
  if (erreur instanceof Anthropic.AuthenticationError) {
    return "Clé d'API refusée par Anthropic. Vérifie-la dans Réglages.";
  }
  if (erreur instanceof Anthropic.RateLimitError) {
    return "Trop de demandes d'affilée. Réessaie dans un instant.";
  }
  if (erreur instanceof Anthropic.APIConnectionError) {
    return "L'API Anthropic est injoignable. Vérifie la connexion réseau.";
  }
  if (erreur instanceof Anthropic.APIError) {
    return `L'API Anthropic a répondu ${erreur.status ?? "en erreur"}. ${erreur.message}`;
  }
  return erreur instanceof Error ? erreur.message : "Échec inattendu de l'appel à Claude.";
}

/**
 * Vérifie la clé par l'appel le moins coûteux qui existe : lister les modèles.
 *
 * On ne dépense pas un jeton pour savoir si une clé est bonne — et un appel qui
 * ne génère rien ne peut pas être refusé pour le contenu de sa demande.
 */
export async function verifierCle(cleApi: string): Promise<void> {
  if (cleApi.trim() === "") throw new AccesRefuse("Aucune clé à vérifier.");
  try {
    await new Anthropic({ apiKey: cleApi }).models.list({ limit: 1 });
  } catch (erreur) {
    throw new AccesRefuse(enClair(erreur));
  }
}

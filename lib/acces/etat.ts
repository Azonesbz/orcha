/**
 * L'état d'accès, côté application locale.
 *
 * Le produit est libre, sous licence MIT : l'écriture est ouverte à quiconque
 * lance l'outil sur sa propre machine. Ce module gardait « un seul endroit à
 * changer si un jour une condition revenait ». Elle est revenue, et c'est le
 * déploiement public.
 *
 * Là-bas l'écoute n'est plus clouée sur 127.0.0.1, et l'image compile tout le
 * dépôt, actions serveur comprises. Un layout qui rend un 404 ne garde pas une
 * Server Action : elle est adressée par un identifiant de build, que le dépôt
 * étant public n'importe qui peut redériver en reconstruisant le même commit.
 * Sans ce refus, ces actions viseraient le disque du serveur.
 *
 * Les trois garde-fous de `lib/ecriture` restent en dessous : ils refusent
 * d'écrire hors des racines `.claude` connues ou dans un plugin.
 */

import { estPublic } from "./role.ts";

/** Le seul appel dont les garde-fous d'écriture ont besoin. */
export async function ecritureOuverte(): Promise<boolean> {
  return !estPublic();
}

"use server";

import { contexteDe } from "@/lib/agent/contexte";
import { suiteProposee } from "@/lib/agent/suites";
import { estPublic } from "@/lib/acces/role";

/**
 * Ce dont l'écran a besoin autour de la discussion.
 *
 * L'appel à l'agent, lui, n'est plus ici : une action serveur ne rend qu'une
 * valeur, une fois, et c'est ce qui laissait l'écran sur « Thinking… » pendant
 * toute la durée du travail. Il vit dans `app/api/agent`, qui peut répondre au
 * fil de l'eau. Ne restent ici que les deux appels courts.
 */

/** Ce que l'écran a besoin de savoir avant même de poser une question. */
export interface ApercuContexte {
  titre: string;
  suggestions: string[];
  peutEcrire: boolean;
}

/**
 * Le contexte de la route, sans son résumé.
 *
 * Le résumé peut contenir un fichier entier : il est recalculé au moment de
 * l'appel, côté serveur, plutôt que de faire l'aller-retour par le navigateur.
 */
export async function lireContexte(chemin: string): Promise<ApercuContexte> {
  // Elle lit le `.claude` de la machine : sur le déploiement public ce serait
  // celui du serveur, et l'écran qui l'appelle n'y existe pas.
  if (estPublic()) return { titre: "", suggestions: [], peutEcrire: false };

  const c = contexteDe(chemin);
  return { titre: c.titre, suggestions: c.suggestions, peutEcrire: c.peutEcrire };
}

/* Le retour arrière n'a plus de bouton : l'encart par tour alourdissait le fil.
   L'instantané, lui, est toujours pris avant chaque écriture — la capacité
   reste entière, seule sa surface a disparu. Pour revenir en arrière :
   `restaurer(id)` de lib/agent/instantane.ts, ou à la main depuis
   ~/.orcha/instantanes/<id>/contenu. */

/**
 * La suite proposée dans le champ, après une réponse.
 *
 * Un appel court et à part, pour que la réponse s'affiche sans l'attendre : un
 * indice de champ ne doit jamais retarder ce qu'on est venu lire.
 */
export async function proposerLaSuite(question: string, reponse: string): Promise<string> {
  if (estPublic()) return "";
  return suiteProposee(question, reponse);
}

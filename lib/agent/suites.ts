/**
 * La suite proposée dans le champ, écrite par un modèle.
 *
 * Une première version la déduisait par expressions régulières — les étapes
 * citées, un « j'ai modifié ». Ça marchait, et ça ne servait pas : la suite
 * utile dépend de ce que la réponse *dit*, pas des mots qu'elle emploie. On
 * demande donc, à part, en un appel court.
 *
 * L'appel est délibérément petit : le modèle le moins cher de la liste, une
 * phrase, peu de jetons. Un indice de champ ne justifie pas la dépense d'une
 * vraie réponse — et s'il échoue on n'affiche rien plutôt que d'alerter,
 * puisque personne n'a demandé cette suggestion.
 */

import Anthropic from "@anthropic-ai/sdk";
import { lireConfig } from "../reglages/config.ts";

/** Assez pour une phrase, trop peu pour un paragraphe. */
const JETONS = 120;

/**
 * Quelques mots, pas une phrase.
 *
 * Un texte d'invite se lit du coin de l'œil, entre deux relectures de la
 * réponse : « Montre le diff » se saisit en un regard, une phrase complète
 * demande de s'arrêter pour la lire, et on ne s'arrête pas pour un indice.
 */
const LONGUEUR_MAXIMALE = 40;

const CONSIGNE = [
  "Tu proposes LA question suivante qu'un développeur poserait à son agent,",
  "à partir de l'échange qu'on te montre.",
  "",
  "Écris CE QUE LE DÉVELOPPEUR VA TAPER dans son champ de saisie. Jamais ce que",
  "l'agent répondrait : pas de « veux-tu que je… », pas de question à l'utilisateur.",
  "Tu écris à sa place, et tu tutoies l'agent.",
  "",
  "QUELQUES MOTS, trois à six, en français. Pas une phrase : la forme d'un",
  "raccourci. « Montre le diff », « Applique à l'étape 6 », « Annule ça ».",
  "Rien d'autre : ni guillemets, ni ponctuation finale, ni préambule, ni liste.",
  "",
  "Elle doit s'appuyer sur ce que la réponse dit vraiment — un fichier qu'elle",
  "vient de changer, une étape qu'elle nomme, une réserve qu'elle émet. Une",
  "suite qui marcherait après n'importe quelle réponse ne vaut rien : dans ce",
  "cas, rends exactement le mot VIDE.",
].join("\n");

/**
 * Rend "" quand il n'y a rien à proposer, ou quand l'appel échoue.
 *
 * Sans clé d'API, on ne propose rien. Le CLI `claude` est le repli habituel
 * d'Orcha, mais ouvrir une session entière pour un indice de champ coûterait
 * plus cher que la réponse qu'il accompagne.
 */
export async function suiteProposee(question: string, reponse: string): Promise<string> {
  const config = lireConfig();
  if (config.cleApi === "" || reponse.trim() === "") return "";

  try {
    const rendu = await new Anthropic({ apiKey: config.cleApi }).messages.create({
      model: "claude-haiku-4-5",
      max_tokens: JETONS,
      system: CONSIGNE,
      messages: [{ role: "user", content: echange(question, reponse) }],
    });
    return nettoyer(rendu.content.map((bloc) => (bloc.type === "text" ? bloc.text : "")).join(""));
  } catch {
    return "";
  }
}

function echange(question: string, reponse: string): string {
  return ["Demandé :", question.trim(), "", "Répondu :", reponse.trim()].join("\n");
}

/**
 * Ce que le modèle rend, ramené à ce que le champ peut afficher.
 *
 * Les guillemets sont le débordement le plus fréquent : la consigne les
 * interdit, et le modèle en met quand même une fois sur dix.
 */
export function nettoyer(brut: string): string {
  const ligne = brut.trim().split("\n")[0]?.trim() ?? "";
  const nu = ligne.replace(/^["'«»\s]+|["'«»\s]+$/g, "");
  if (nu === "" || nu.toUpperCase() === "VIDE") return "";
  return nu.length > LONGUEUR_MAXIMALE ? "" : nu;
}

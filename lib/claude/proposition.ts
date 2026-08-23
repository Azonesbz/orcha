/**
 * Demander à Claude un nouveau corps de fichier.
 *
 * Le modèle rend le corps **entier**, jamais une liste d'opérations : c'est le
 * seul format qu'on peut lui demander sans dépendre d'une syntaxe qu'il
 * tiendrait mal. Le découpage en blocs se déduit ensuite par comparaison —
 * voir `lib/modules/difference.ts`.
 *
 * Rien n'est écrit ici. Cette fonction lit une intention et rend un texte ;
 * l'écriture demande un geste explicite, et passe par `enregistrerCompetence`.
 */

import Anthropic from "@anthropic-ai/sdk";
import { lireConfig } from "../reglages/config.ts";
import type { Modele } from "../reglages/modeles.ts";

export class PropositionRefusee extends Error {}

export interface DemandeDeProposition {
  /** Ce que l'utilisateur a écrit dans le panneau. */
  instruction: string;
  /** Le corps actuel, tel qu'il est sur le disque. */
  corps: string;
  /** Ce qu'on édite — le modèle n'a pas à le deviner du contenu. */
  sorte: "compétence" | "sous-agent";
  nom: string;
  modele?: Modele;
}

const CONSIGNE = [
  "Tu modifies un fichier Markdown de configuration de Claude Code.",
  "",
  "Rends le corps du fichier ENTIER, modifié selon la demande. Rien d'autre :",
  "ni explication, ni préambule, ni bloc de code englobant.",
  "",
  "Trois règles absolues :",
  "— Ne touche à rien que la demande ne vise pas. Une phrase non concernée",
  "  ressort identique, mot pour mot.",
  "— Garde la structure en sections `## Titre` et la forme de chaque section :",
  "  une liste numérotée reste une liste numérotée, renumérotée de 1 à n.",
  "— N'écris pas le frontmatter : il commence au premier `#` ou `##`.",
].join("\n");

export async function demanderProposition(demande: DemandeDeProposition): Promise<string> {
  const config = lireConfig();
  if (config.cleApi === "") {
    throw new PropositionRefusee(
      "Aucune clé d'API n'est enregistrée. Ajoute-la dans Réglages pour activer le panneau Claude.",
    );
  }
  if (demande.instruction.trim() === "") {
    throw new PropositionRefusee("Décris le changement voulu avant de demander une proposition.");
  }

  const client = new Anthropic({ apiKey: config.cleApi });
  try {
    const reponse = await client.messages.create({
      model: demande.modele ?? config.modele,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: CONSIGNE,
      messages: [{ role: "user", content: enonce(demande) }],
    });
    return sansCloture(texteDe(reponse));
  } catch (erreur) {
    throw new PropositionRefusee(enClair(erreur));
  }
}

function enonce(demande: DemandeDeProposition): string {
  return [
    `Fichier : ${demande.sorte} « ${demande.nom} ».`,
    "",
    "Demande :",
    demande.instruction.trim(),
    "",
    "Corps actuel :",
    demande.corps,
  ].join("\n");
}

function texteDe(reponse: Anthropic.Message): string {
  const texte = reponse.content
    .filter((bloc): bloc is Anthropic.TextBlock => bloc.type === "text")
    .map((bloc) => bloc.text)
    .join("");

  if (reponse.stop_reason === "refusal") {
    throw new PropositionRefusee("Le modèle a refusé cette demande. Reformule-la.");
  }
  if (texte.trim() === "") {
    throw new PropositionRefusee("Le modèle n'a rien rendu. Réessaie.");
  }
  return texte;
}

/**
 * Retire la clôture de code dont le modèle enrobe parfois un fichier entier.
 *
 * La consigne l'interdit, mais un garde-fou de trois lignes vaut mieux qu'une
 * proposition dont chaque ligne est décalée de trois caractères.
 */
function sansCloture(texte: string): string {
  const cloture = /^```[a-z]*\n([\s\S]*)\n```\s*$/.exec(texte.trim());
  return `${(cloture ? cloture[1] : texte).trim()}\n`;
}

function enClair(erreur: unknown): string {
  if (erreur instanceof PropositionRefusee) return erreur.message;
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
  if (cleApi.trim() === "") throw new PropositionRefusee("Aucune clé à vérifier.");
  try {
    await new Anthropic({ apiKey: cleApi }).models.list({ limit: 1 });
  } catch (erreur) {
    throw new PropositionRefusee(enClair(erreur));
  }
}

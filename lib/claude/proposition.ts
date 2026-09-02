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

import { spawnSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import { lancerClaude } from "./lancement.ts";
import { lireConfig } from "../reglages/config.ts";
import type { Modele } from "../reglages/modeles.ts";

export class PropositionRefusee extends Error {}

export interface DemandeDeProposition {
  /** Ce que l'utilisateur a écrit dans le panneau. */
  instruction: string;
  /** Le corps actuel, tel qu'il est sur le disque. */
  corps: string;
  /** Ce qu'on édite — le modèle n'a pas à le deviner du contenu. */
  sorte: "compétence" | "sous-agent" | "commande";
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

export async function demanderProposition(demande: DemandeDeProposition): Promise<string> {
  const config = lireConfig();
  if (demande.instruction.trim() === "") {
    throw new PropositionRefusee("Décris le changement voulu avant de demander une proposition.");
  }

  // Sans clé d'API, on passe par le CLI `claude` — donc par l'abonnement de la
  // machine, et non par une facturation à l'usage. Une clé enregistrée veut
  // dire qu'on la veut : elle gagne.
  if (config.cleApi === "") return parLeCli(demande);

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

/**
 * La même demande, passée au CLI `claude` en mode impression.
 *
 * Les outils sont coupés : on veut un texte, pas un agent qui irait lire ou
 * écrire des fichiers de son côté — l'écriture reste le geste « Appliquer ».
 */
async function parLeCli(demande: DemandeDeProposition): Promise<string> {
  if (!cliDisponible()) {
    throw new PropositionRefusee(
      "Ni clé d'API dans Réglages, ni commande « claude » sur cette machine. " +
        "Installe Claude Code, ou renseigne une clé.",
    );
  }

  try {
    // ponytail: le corps passe en argument, pas par stdin — un SKILL.md pèse
    // quelques kilo-octets, loin de la limite d'argv. Passer par stdin si un
    // fichier énorme apparaît un jour.
    const sortie = await lancerClaude({
      args: [
        "-p", enonce(demande),
        "--model", demande.modele ?? lireConfig().modele,
        "--append-system-prompt", CONSIGNE,
        "--disallowedTools", "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task",
      ],
      cwd: process.cwd(),
      delai: 180_000,
    });
    refuserSiSessionMorte(sortie);
    if (sortie.trim() === "") {
      throw new PropositionRefusee("Le CLI « claude » n'a rien rendu. Vérifie `claude -p` en terminal.");
    }
    return sansCloture(sortie);
  } catch (erreur) {
    if (erreur instanceof PropositionRefusee) throw erreur;
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

/**
 * Le CLI signale une session morte sur STDOUT, avec un code de retour 0.
 *
 * Sans ce contrôle, « Failed to authenticate » s'affiche comme si c'était la
 * réponse du modèle — un échec déguisé en résultat, exactement ce qu'Orcha
 * existe pour empêcher.
 */
export function refuserSiSessionMorte(sortie: string): void {
  if (/^Failed to authenticate/im.test(sortie)) {
    throw new PropositionRefusee(
      "Session Claude Code expirée. Lance `claude` une fois en terminal pour te reconnecter.",
    );
  }
}

export function enClair(erreur: unknown): string {
  if (erreur instanceof PropositionRefusee) return erreur.message;
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
  if (cleApi.trim() === "") throw new PropositionRefusee("Aucune clé à vérifier.");
  try {
    await new Anthropic({ apiKey: cleApi }).models.list({ limit: 1 });
  } catch (erreur) {
    throw new PropositionRefusee(enClair(erreur));
  }
}

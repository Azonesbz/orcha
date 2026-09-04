/**
 * L'agent d'Orcha : Claude Code, lancé sur le périmètre de l'écran courant.
 *
 * Ce n'est pas un appel à l'API Messages mais le CLI `claude` — un agent a
 * besoin d'outils, et les lui donner par l'API demanderait d'implémenter une
 * boucle d'outils ici. Conséquence assumée : ce chemin passe toujours par
 * l'abonnement de la machine, même si une clé d'API est enregistrée.
 *
 * Il écrit directement, sans la relecture qui garde le reste du produit. Ce qui
 * le borne, c'est `--add-dir` et, dans le dépôt, git — la ligne de commande
 * construite ici, et rien d'autre. D'où des tests qui la construisent plutôt
 * que de la lancer. En lecture seule, `--allowedTools` s'y ajoute ; en
 * écriture, il n'y a plus de liste du tout.
 *
 * Il rend son travail au fil de l'eau, pas d'un bloc à la fin : voir
 * `flux.ts` pour ce que l'écran en fait.
 */

import type { Contexte } from "../agent/contexte.ts";
import { estPublic } from "../acces/role.ts";
import type { Modele } from "../reglages/modeles.ts";
import { lancerEnFlux } from "./lancement.ts";
import { DOCTRINE } from "./doctrine.ts";
import { lireGestes, type Geste } from "./flux.ts";
import { cliDisponible, enClair } from "./proposition.ts";

/** Lire et chercher, sans rien changer. Le cas d'un plugin, ou d'un écran de lecture. */
const LECTURE = "Read,Glob,Grep";

/** Un agent qui construit un workflow entier prend son temps. */
const DELAI = 600_000;

/**
 * Au-delà, le titre n'ouvre plus la réponse : il en titre une section tardive.
 *
 * Couper à cet endroit-là ferait perdre l'essentiel pour garder l'annexe.
 */
const PREAMBULE_MAXIMAL = 600;

const TITRE = /^#{1,3} .+$/m;

/**
 * Ce que l'agent a écrit, sans la fin de son geste précédent.
 *
 * Le dernier message commence volontiers par refermer ce qu'il venait de faire :
 * « Bon, plus qu'une seule référence… ». Lu seul dans un panneau, ça ouvre sur
 * un raisonnement dont personne n'a vu le début.
 *
 * La doctrine lui demande un titre en tête ; quand il en pose un quand même
 * trop bas, on affiche à partir de là. Quand il n'y a pas de titre, ou qu'il
 * arrive trop tard, on ne touche à rien : mieux vaut un préambule qu'une
 * réponse amputée.
 */
export function sansPreambule(texte: string): string {
  const trouve = TITRE.exec(texte);
  if (!trouve?.index || trouve.index > PREAMBULE_MAXIMAL) return texte;
  const reste = texte.slice(trouve.index).trim();
  return reste === "" ? texte : reste;
}

/**
 * Construit la ligne de commande. Séparé de l'exécution pour être testable.
 *
 * C'est le CLI qui tient la conversation, pas Orcha : le premier tour ouvre une
 * session et lui donne le contexte de l'écran, les suivants la reprennent et
 * n'envoient que la question. Renvoyer le contexte à chaque tour gonflerait
 * l'invite et ferait relire à l'agent ce qu'il sait déjà.
 */
export function argumentsDeLAgent(
  contexte: Contexte,
  instruction: string,
  modele: Modele | string,
  session: string,
  ouverture: boolean,
  contexteNeuf = ouverture,
): string[] {
  const commun = [
    "--model", modele,
    "--add-dir", contexte.dossier,
    // Le dépôt auquel ce `.claude` appartient. Sans lui, l'agent voit la
    // configuration mais pas le code qu'elle sert : ni branche, ni test, ni
    // pull request.
    ...(contexte.projet ? ["--add-dir", contexte.projet] : []),
    // En écriture, aucune liste : l'agent dispose de tout ce que Claude Code
    // sait faire — serveurs MCP, compétences et shells en arrière-plan compris.
    // Énumérer les outils ne bornait plus rien depuis que `Bash` était accordé,
    // un shell sortant de n'importe quelle liste ; ça ne faisait qu'amputer
    // l'agent. Le contrepoids reste les dossiers ouverts, et git dans le dépôt.
    ...(contexte.peutEcrire ? [] : ["--allowedTools", LECTURE]),
    // En mode `-p`, aucun humain n'est là pour répondre à une demande
    // d'approbation : l'agent restait bloqué à la première écriture. Ce qui
    // borne les dégâts n'est donc plus l'invite, mais les dossiers ouverts
    // ci-dessus — et, dans le dépôt, git.
    "--permission-mode", "bypassPermissions",
    // Une ligne JSON par événement, au fil de l'eau. `--verbose` n'est pas un
    // réglage de confort : sous `-p`, le CLI refuse `stream-json` sans lui.
    "--output-format", "stream-json",
    "--verbose",
    // Le texte de la réponse, mot à mot, dans des `stream_event`. Sans ça, la
    // réponse tombe d'un bloc au `result`, après toute l'attente.
    "--include-partial-messages",
  ];

  if (!ouverture) {
    // La conversation continue ; on ne rappelle l'écran que s'il a changé.
    const dit = contexteNeuf
      ? `${instruction.trim()}\n\n--- Je regarde maintenant : ${contexte.titre} ---\n${contexte.resume}`
      : instruction.trim();
    return ["-p", dit, "--resume", session, ...commun];
  }

  return [
    "-p", `${instruction.trim()}\n\n--- Contexte : ${contexte.titre} ---\n${contexte.resume}`,
    "--session-id", session,
    "--append-system-prompt", DOCTRINE,
    ...commun,
  ];
}

/**
 * L'agent au travail, geste par geste.
 *
 * Rien n'est levé : un refus est un geste comme un autre, et l'abonné en a
 * déjà reçu vingt quand il tombe. Lever ici obligerait l'écran à tenir deux
 * chemins pour la même chose — ce qui a échoué après avoir à moitié écrit.
 */
export async function* suivreLAgent(
  contexte: Contexte,
  instruction: string,
  modele: Modele | string,
  session: string,
  ouverture: boolean,
  contexteNeuf = ouverture,
): AsyncGenerator<Geste> {
  const refus = refusDEntree(instruction);
  if (refus) return yield { sorte: "echec", quoi: refus };

  const args = argumentsDeLAgent(contexte, instruction, modele, session, ouverture, contexteNeuf);
  try {
    for await (const ligne of lancerEnFlux({
      args,
      // Le dépôt quand il y en a un : `git` et `gh` n'ont de sens que lancés
      // dedans. Sans ça, une pull request échouerait sur « not a git
      // repository » alors que tous les outils sont pourtant accordés.
      cwd: contexte.projet ?? contexte.dossier,
      delai: DELAI,
    })) {
      for (const geste of lireGestes(ligne)) yield acheve(geste);
    }
  } catch (erreur) {
    yield { sorte: "echec", quoi: enClair(erreur) };
  }
}

/** Ce qui se refuse avant d'avoir lancé quoi que ce soit. */
function refusDEntree(instruction: string): string {
  // Sur le déploiement public, l'écran rend un 404 mais la route qui mène ici
  // reste joignable. Le refus se pose au passage obligé vers le CLI, pas dans
  // la page — et il refuse au lieu de retomber en lecture seule : lire le
  // `.claude` du serveur n'a pas plus de sens qu'y écrire.
  if (estPublic()) return "L'agent ne tourne que sur ta machine : ici, il viserait le disque du serveur.";
  if (instruction.trim() === "") return "Écris ta demande avant de lancer l'agent.";
  if (!cliDisponible()) {
    return "La commande « claude » est introuvable sur cette machine. L'agent en dépend : " +
      "il a besoin d'outils, que l'API seule ne fournit pas.";
  }
  return "";
}

/** La réponse finale, dégrossie ; l'échec du CLI, dit en français. */
function acheve(geste: Geste): Geste {
  if (geste.sorte === "fin") {
    return { ...geste, quoi: sansPreambule(geste.quoi.trim()) || "L'agent n'a rien répondu." };
  }
  if (geste.sorte === "echec") return { ...geste, quoi: enClair(new Error(geste.quoi)) };
  return geste;
}

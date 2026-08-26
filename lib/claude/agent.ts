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
 */

import type { Contexte } from "../agent/contexte.ts";
import { estPublic } from "../acces/role.ts";
import type { Modele } from "../reglages/modeles.ts";
import { lancerClaude } from "./lancement.ts";
import { cliDisponible, enClair, PropositionRefusee, refuserSiSessionMorte } from "./proposition.ts";

/** Lire et chercher, sans rien changer. Le cas d'un plugin, ou d'un écran de lecture. */
const LECTURE = "Read,Glob,Grep";

const DOCTRINE = [
  "Tu assistes depuis Orcha, un outil qui montre ce qu'un dossier .claude déclare",
  "et ce qui charge vraiment. Réponds en français, brièvement.",
  "",
  "Règles du produit, non négociables :",
  "— N'écris JAMAIS dans un plugin (chemin contenant /plugins/cache/ ou",
  "  /plugins/marketplaces/) : c'est un clone réécrit à la prochaine mise à jour,",
  "  la modification serait perdue en silence.",
  "— Une étape déclarée dans un tableau de séquence a TOUJOURS son fichier sur le",
  "  disque. Écrire l'un sans l'autre fabrique l'écart que cet outil sert à détecter.",
  "— Une séquence se renumérote de 1 à n, sans trou.",
  "— Le frontmatter d'un SKILL.md ne se re-sérialise pas : modifie les lignes",
  "  visées, laisse les autres identiques.",
  "",
  "Si tu ne modifies rien, dis ce que tu as constaté. Ne réécris pas un fichier",
  "pour le plaisir de le réécrire.",
].join("\n");

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
    "--output-format", "text",
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

export async function demanderALAgent(
  contexte: Contexte,
  instruction: string,
  modele: Modele | string,
  session: string,
  ouverture: boolean,
  contexteNeuf = ouverture,
): Promise<string> {
  // Avant tout le reste : sur le déploiement public, l'écran rend un 404 mais
  // l'action serveur qui mène ici reste joignable. Le refus se pose au passage
  // obligé vers le CLI, pas dans la page — et il refuse au lieu de retomber en
  // lecture seule : lire le `.claude` du serveur n'a pas plus de sens qu'y
  // écrire, et l'agent y disposerait d'un shell.
  if (estPublic()) {
    throw new PropositionRefusee(
      "L'agent ne tourne que sur ta machine : ici, il viserait le disque du serveur.",
    );
  }
  if (instruction.trim() === "") {
    throw new PropositionRefusee("Écris ta demande avant de lancer l'agent.");
  }
  if (!cliDisponible()) {
    throw new PropositionRefusee(
      "La commande « claude » est introuvable sur cette machine. L'agent en dépend : " +
        "il a besoin d'outils, que l'API seule ne fournit pas.",
    );
  }

  try {
    const sortie = await lancerClaude({
      args: argumentsDeLAgent(contexte, instruction, modele, session, ouverture, contexteNeuf),
      // Le dépôt quand il y en a un : `git` et `gh` n'ont de sens que lancés
      // dedans. Sans ça, une pull request échouerait sur « not a git
      // repository » alors que tous les outils sont pourtant accordés.
      cwd: contexte.projet ?? contexte.dossier,
      delai: 600_000,
    });
    refuserSiSessionMorte(sortie);
    return sortie.trim() || "L'agent n'a rien répondu.";
  } catch (erreur) {
    throw new PropositionRefusee(enClair(erreur));
  }
}

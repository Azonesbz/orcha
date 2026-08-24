/**
 * L'agent d'Orcha : Claude Code, lancé sur le périmètre de l'écran courant.
 *
 * Ce n'est pas un appel à l'API Messages mais le CLI `claude` — un agent a
 * besoin d'outils, et les lui donner par l'API demanderait d'implémenter une
 * boucle d'outils ici. Conséquence assumée : ce chemin passe toujours par
 * l'abonnement de la machine, même si une clé d'API est enregistrée.
 *
 * Il écrit directement, sans la relecture qui garde le reste du produit. Ce qui
 * l'empêche de sortir du périmètre, c'est `--add-dir` et `--allowedTools` — la
 * ligne de commande construite ici, et rien d'autre. D'où des tests qui la
 * construisent plutôt que de la lancer.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Contexte } from "../agent/contexte.ts";
import type { Modele } from "../reglages/modeles.ts";
import { cliDisponible, enClair, PropositionRefusee, refuserSiSessionMorte } from "./proposition.ts";

/** Lire, chercher, ouvrir. Jamais `Bash` : lancer une commande sort du périmètre. */
const LECTURE = "Read,Glob,Grep";
const ECRITURE = `${LECTURE},Edit,Write`;

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

/** Construit la ligne de commande. Séparé de l'exécution pour être testable. */
export function argumentsDeLAgent(contexte: Contexte, instruction: string, modele: Modele | string): string[] {
  return [
    "-p", `${instruction.trim()}\n\n--- Contexte : ${contexte.titre} ---\n${contexte.resume}`,
    "--model", modele,
    "--add-dir", contexte.dossier,
    "--allowedTools", contexte.peutEcrire ? ECRITURE : LECTURE,
    "--append-system-prompt", DOCTRINE,
    "--output-format", "text",
  ];
}

const lancer = promisify(execFile);

export async function demanderALAgent(
  contexte: Contexte,
  instruction: string,
  modele: Modele | string,
): Promise<string> {
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
    const { stdout } = await lancer("claude", argumentsDeLAgent(contexte, instruction, modele), {
      cwd: contexte.dossier,
      maxBuffer: 16 * 1024 * 1024,
      // Un agent qui construit un workflow entier prend son temps.
      timeout: 600_000,
    });
    refuserSiSessionMorte(stdout);
    return stdout.trim() || "L'agent n'a rien répondu.";
  } catch (erreur) {
    throw new PropositionRefusee(enClair(erreur));
  }
}

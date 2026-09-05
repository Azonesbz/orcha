/**
 * L'écriture d'une commande : `commands/<nom>.md`, et rien d'autre.
 *
 * Sur le disque, une commande ressemble à un agent — un Markdown, un
 * frontmatter, un nom. Elle ne se déclenche pas pareil : elle est tapée, pas
 * choisie. D'où un module distinct, dont le garde-fou vise `commands/` et dont
 * le squelette parle de `$ARGUMENTS`.
 */

import { mkdirSync, renameSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  cheminModifiable,
  doitEtreLibre,
  EcritureRefusee,
  ecrireAtomiquement,
  nomValide,
  racineDe,
  type Portee,
} from "./garde.ts";

export interface NouvelleCommande {
  nom: string;
  description: string;
  indiceArgument: string;
}

/** Écrit `commands/<nom>.md` dans la portée demandée. Rend le chemin écrit. */
export function creerCommande(portee: Portee, commande: NouvelleCommande): string {
  const nom = nomValide(commande.nom);
  const description = commande.description.trim();
  if (!description) {
    throw new EcritureRefusee(
      "Une commande sans description ne se présente nulle part : ni dans /help, ni dans " +
        "la liste que Claude Code déroule à la frappe, ni au modèle qui pourrait l'appeler.",
    );
  }

  const chemin = join(racineDe(portee), "commands", `${nom}.md`);
  cheminModifiable(chemin);
  doitEtreLibre(chemin);

  ecrireAtomiquement(chemin, fichierCommande(description, commande.indiceArgument));
  return chemin;
}

/**
 * Le squelette. Pas de `name:` : contrairement à un agent, une commande
 * s'invoque par son chemin de fichier — un `name` divergent n'y changerait
 * rien et ferait croire le contraire.
 */
function fichierCommande(description: string, indice: string): string {
  const entete = [`description: ${description}`];
  if (indice.trim()) entete.push(`argument-hint: ${indice.trim()}`);

  return [
    "---",
    ...entete,
    "---",
    "",
    "À écrire : ce corps part à Claude tel quel, comme si tu l'avais tapé.",
    "",
    "$ARGUMENTS",
    "",
  ].join("\n");
}

/** Le garde partagé, plus la seule règle propre aux commandes. */
export function verifierCheminCommande(chemin: string): string {
  const absolu = cheminModifiable(chemin);
  if (!/\/commands\/[^/]+\.md$/.test(absolu)) {
    throw new EcritureRefusee("Seuls les fichiers d'un dossier commands/ sont modifiables ici.");
  }
  return absolu;
}

const DOSSIER_RETIREES = "retirees";

/**
 * Retire une commande : elle quitte `commands/`, elle n'est pas effacée.
 *
 * La destination est un dossier `retirees/` **voisin**, jamais dessous :
 * Claude Code lit les sous-dossiers de `commands/` comme des espaces de noms,
 * et une commande « retirée » y resterait chargée sous `/retirees:<nom>`.
 * Un `~/.claude` n'est pas toujours sous Git — un effacement y serait
 * irrécupérable. Rend le chemin où le fichier a été déplacé.
 */
export function retirerCommande(chemin: string): string {
  const absolu = verifierCheminCommande(chemin);
  const destination = join(dirname(dirname(absolu)), DOSSIER_RETIREES, basename(absolu));

  doitEtreLibre(destination);
  mkdirSync(dirname(destination), { recursive: true });
  renameSync(absolu, destination);
  return destination;
}

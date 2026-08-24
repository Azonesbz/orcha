/**
 * Refermer les trous de numérotation d'un workflow.
 *
 * Retirer l'étape 03 laisse 00, 01, 02, 04, 05. Renuméroter demande de toucher
 * quatre choses à la fois : le nom des fichiers, le numéro et le chemin dans le
 * tableau, le titre à l'intérieur de chaque étape, et les renvois que les
 * étapes se font entre elles — `halo` en compte des dizaines.
 *
 * Deux règles gouvernent le code :
 *
 * 1. **Une seule passe de substitution.** Remplacer 04→03 puis 03→02
 *    séquentiellement écraserait le premier remplacement. Tous les anciens
 *    jetons sont donc reconnus par une seule expression, et remplacés d'un coup.
 * 2. **On montre avant d'écrire.** La transformation est large ; l'appelant
 *    obtient d'abord le plan, ligne par ligne, et décide.
 */

import { renameSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { lireTexte } from "../lecture/fichiers.ts";
import type { Workflow } from "../lecture/workflow.ts";
import { cheminModifiable, EcritureRefusee, ecrireAtomiquement } from "./garde.ts";
import { DIVERGENCE, empreinte } from "./empreinte.ts";
import { conventionDe } from "./etape.ts";

export interface Deplacement {
  ancienNumero: string;
  nouveauNumero: string;
  ancienRelatif: string;
  nouveauRelatif: string;
  ancienChemin: string;
  nouveauChemin: string;
}

export interface Occurrence {
  fichier: string;
  ligne: number;
  avant: string;
  apres: string;
}

export interface PlanRenumerotation {
  deplacements: Deplacement[];
  occurrences: Occurrence[];
}

/**
 * L'empreinte d'un plan : les renommages ET chaque ligne réécrite.
 *
 * Prendre les seuls renommages ne suffirait pas — une étape peut changer de
 * contenu sans changer de numéro, et l'aperçu montre ce contenu.
 */
export function empreinteDuPlan(plan: PlanRenumerotation): string {
  return empreinte([
    ...plan.deplacements.map((d) => `${d.ancienRelatif}>${d.nouveauRelatif}`),
    ...plan.occurrences.map((o) => `${o.fichier}:${o.ligne}:${o.apres}`),
  ]);
}

/**
 * Le plan complet, sans rien écrire. Un plan vide veut dire « rien à faire ».
 *
 * `ordre` donne les numéros actuels dans l'ordre voulu — c'est ce qui permet
 * de RÉORDONNER et pas seulement de refermer les trous. Sans lui, l'ordre est
 * celui des numéros, et le comportement reste celui d'origine.
 */
export function planifierRenumerotation(
  cheminSkill: string,
  workflow: Workflow,
  ordre?: string[],
): PlanRenumerotation {
  const absolu = cheminModifiable(cheminSkill);
  const { largeur } = conventionDe(workflow);
  const racine = dirname(absolu);

  const ordonnees = ordre ? selonLOrdre(workflow, ordre) : [...workflow.etapes].sort((a, b) => Number(a.numero) - Number(b.numero));
  const deplacements = ordonnees
    .map((etape, index) => construire(etape, String(index).padStart(largeur, "0"), racine))
    .filter((d): d is Deplacement => d !== null);

  if (deplacements.length === 0) return { deplacements: [], occurrences: [] };

  const substituer = substitution(deplacements);
  const fichiers = [absolu, ...ordonnees.filter((e) => e.present).map((e) => e.cheminAbsolu)];
  const occurrences = fichiers.flatMap((fichier) => occurrencesDe(fichier, substituer, deplacements));

  return { deplacements, occurrences };
}

/**
 * Les étapes rangées selon l'ordre demandé.
 *
 * Un ordre incomplet est refusé plutôt que complété : réordonner en oubliant
 * une étape la ferait disparaître du tableau, et une étape hors séquence n'est
 * plus jamais lue — l'écart même que cet outil sert à détecter.
 */
function selonLOrdre(workflow: Workflow, ordre: string[]): Workflow["etapes"] {
  const parNumero = new Map(workflow.etapes.map((e) => [e.numero, e]));
  if (ordre.length !== workflow.etapes.length || new Set(ordre).size !== ordre.length) {
    throw new EcritureRefusee(
      `L'ordre demandé compte ${ordre.length} étapes pour ${workflow.etapes.length} au tableau.`,
    );
  }

  return ordre.map((numero) => {
    const etape = parNumero.get(numero);
    if (!etape) throw new EcritureRefusee(`L'étape ${numero} n'est pas dans ce workflow.`);
    return etape;
  });
}

function construire(
  etape: Workflow["etapes"][number],
  nouveauNumero: string,
  racine: string,
): Deplacement | null {
  if (etape.numero === nouveauNumero) return null;
  const nouveauRelatif = etape.fichierDeclare.replace(
    new RegExp(`(^|/)([^/]*?)-${echapper(etape.numero)}-`),
    `$1$2-${nouveauNumero}-`,
  );
  return {
    ancienNumero: etape.numero,
    nouveauNumero,
    ancienRelatif: etape.fichierDeclare,
    nouveauRelatif,
    ancienChemin: etape.cheminAbsolu,
    nouveauChemin: join(racine, nouveauRelatif),
  };
}

/**
 * Une expression pour tous les anciens jetons, du plus long au plus court.
 *
 * L'ordre compte : `steps/step-04-branch-pr.md` doit être reconnu avant
 * `step-04-branch-pr`, lui-même avant `step-04`. Sinon le plus court gagne et
 * laisse une queue de chemin orpheline.
 */
function substitution(deplacements: Deplacement[]): (texte: string) => string {
  const table = new Map<string, string>();

  for (const d of deplacements) {
    const ancienNom = basename(d.ancienRelatif, ".md");
    const nouveauNom = basename(d.nouveauRelatif, ".md");
    const prefixe = ancienNom.replace(/-\d+-.*$/, "");

    table.set(d.ancienRelatif, d.nouveauRelatif);
    table.set(ancienNom, nouveauNom);
    table.set(`${prefixe}-${d.ancienNumero}`, `${prefixe}-${d.nouveauNumero}`);
    for (const mot of ["Étape", "étape", "Step", "step"]) {
      table.set(`${mot} ${d.ancienNumero}`, `${mot} ${d.nouveauNumero}`);
    }
  }

  const jetons = [...table.keys()].sort((a, b) => b.length - a.length).map(echapper);
  const motif = new RegExp(`(${jetons.join("|")})(?![\\w-])`, "g");
  return (texte) => texte.replace(motif, (trouve) => table.get(trouve) ?? trouve);
}

function occurrencesDe(
  fichier: string,
  substituer: (texte: string) => string,
  deplacements: Deplacement[],
): Occurrence[] {
  const contenu = lireTexte(fichier);
  if (contenu === null) return [];

  return contenu.split("\n").flatMap((ligne, index) => {
    const apres = reecrireLaLigne(ligne, substituer, deplacements);
    return apres === ligne ? [] : [{ fichier, ligne: index + 1, avant: ligne, apres }];
  });
}

const LIGNE_ETAPE = /^(\|\s*)(\d+)(\s*\|)/;

/**
 * Une ligne réécrite, cellule de numéro comprise.
 *
 * La substitution textuelle corrige le chemin cité, mais pas le `| 04 |` de
 * tête : ce nombre nu ne ressemble à aucun jeton. On le rattrape en regardant
 * vers quelle étape la ligne pointe une fois le chemin corrigé.
 */
function reecrireLaLigne(
  ligne: string,
  substituer: (texte: string) => string,
  deplacements: Deplacement[],
): string {
  const substituee = substituer(ligne);
  const cellule = LIGNE_ETAPE.exec(substituee);
  if (!cellule) return substituee;

  const vise = deplacements.find((d) => substituee.includes(`\`${d.nouveauRelatif}\``));
  if (!vise) return substituee;
  return substituee.replace(LIGNE_ETAPE, `$1${vise.nouveauNumero}$3`);
}

/**
 * Applique le plan : d'abord les renommages, puis les textes.
 *
 * Les renommages passent par un nom provisoire. Sans cela, renommer 04 en 03
 * écraserait le fichier 03 qui n'a pas encore bougé.
 */
export function appliquerRenumerotation(
  cheminSkill: string,
  workflow: Workflow,
  empreinteAttendue?: string,
  ordre?: string[],
): PlanRenumerotation {
  const plan = planifierRenumerotation(cheminSkill, workflow, ordre);
  if (plan.deplacements.length === 0) {
    throw new EcritureRefusee(
      ordre
        ? "Cet ordre est déjà celui du tableau : rien à faire."
        : "La numérotation est déjà continue : rien à faire.",
    );
  }
  if (empreinteAttendue && empreinteDuPlan(plan) !== empreinteAttendue) {
    throw new EcritureRefusee(DIVERGENCE);
  }

  const provisoires = plan.deplacements
    .filter((d) => lireTexte(d.ancienChemin) !== null)
    .map((d) => {
      const provisoire = `${d.ancienChemin}.renum-${process.pid}`;
      cheminModifiable(d.ancienChemin);
      cheminModifiable(d.nouveauChemin);
      renameSync(d.ancienChemin, provisoire);
      return { provisoire, destination: d.nouveauChemin };
    });

  for (const { provisoire, destination } of provisoires) renameSync(provisoire, destination);

  const parFichier = new Map<string, Occurrence[]>();
  for (const occurrence of plan.occurrences) {
    parFichier.set(occurrence.fichier, [...(parFichier.get(occurrence.fichier) ?? []), occurrence]);
  }

  for (const [ancienFichier, occurrences] of parFichier) {
    const deplace = plan.deplacements.find((d) => d.ancienChemin === ancienFichier);
    const fichier = deplace ? deplace.nouveauChemin : ancienFichier;
    const contenu = lireTexte(fichier);
    if (contenu === null) continue;

    const lignes = contenu.split("\n");
    for (const occurrence of occurrences) lignes[occurrence.ligne - 1] = occurrence.apres;
    ecrireAtomiquement(fichier, lignes.join("\n"));
  }

  return plan;
}

function echapper(valeur: string): string {
  return valeur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ajouter une étape à un workflow, des deux côtés à la fois.
 *
 * Une étape n'existe que si son fichier est là ET si le tableau `## Séquence`
 * l'appelle. Écrire l'un sans l'autre fabrique exactement l'écart que cet outil
 * sert à détecter — on écrit donc les deux, et on défait le premier si le
 * second échoue.
 */

import { mkdirSync, renameSync, unlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { lireTexte } from "../lecture/fichiers.ts";
import type { Workflow } from "../lecture/workflow.ts";
import { cheminModifiable, doitEtreLibre, EcritureRefusee, ecrireAtomiquement, enSlug } from "./garde.ts";
import { DIVERGENCE, empreinteDeFichiers } from "./empreinte.ts";

export interface Convention {
  /** `steps` chez halo, `etapes` chez lancer. */
  dossier: string;
  /** `step` ou `etape`, le préfixe des noms de fichiers. */
  prefixe: string;
  /** Largeur du numéro : 2 pour `00`. */
  largeur: number;
  prochainNumero: string;
}

/**
 * Déduit la convention du workflow au lieu d'en imposer une.
 *
 * `halo` écrit `steps/step-00-init.md`, `lancer` écrit
 * `etapes/etape-00-reconnaissance.md`. Les deux ont raison chez eux.
 */
export function conventionDe(workflow: Workflow): Convention {
  const derniere = workflow.etapes.at(-1);
  if (!derniere) throw new EcritureRefusee("Ce workflow n'a aucune étape à imiter.");

  const dossier = dirname(derniere.fichierDeclare);
  const nom = basename(derniere.fichierDeclare, ".md");
  const decoupe = /^(.*?)-(\d+)-/.exec(nom);
  if (!decoupe) throw new EcritureRefusee(`Nom d'étape inattendu : « ${nom} ».`);

  const largeur = decoupe[2].length;
  const maximum = Math.max(...workflow.etapes.map((e) => Number(e.numero)));
  return {
    dossier,
    prefixe: decoupe[1],
    largeur,
    prochainNumero: String(maximum + 1).padStart(largeur, "0"),
  };
}

export interface NouvelleEtape {
  titre: string;
  sortieAttendue: string;
}

/** Crée le fichier d'étape et ajoute sa ligne au tableau. Rend le chemin écrit. */
export function ajouterEtape(cheminSkill: string, workflow: Workflow, etape: NouvelleEtape): string {
  const absolu = cheminModifiable(cheminSkill);
  const convention = conventionDe(workflow);

  const titre = etape.titre.trim();
  if (!titre) throw new EcritureRefusee("Une étape sans titre ne se lit pas.");
  const slug = enSlug(titre);
  if (!slug) throw new EcritureRefusee(`« ${titre} » ne donne aucun nom de fichier utilisable.`);

  refuserUnDoublon(workflow, slug);

  const relatif = `${convention.dossier}/${convention.prefixe}-${convention.prochainNumero}-${slug}.md`;
  const cheminEtape = join(dirname(absolu), relatif);
  cheminModifiable(cheminEtape);
  doitEtreLibre(cheminEtape);

  const skill = lireTexte(absolu);
  if (skill === null) throw new EcritureRefusee("Le SKILL.md est introuvable.");

  ecrireAtomiquement(cheminEtape, squelette(convention.prochainNumero, titre, etape.sortieAttendue));
  try {
    ecrireAtomiquement(absolu, avecLigneAjoutee(skill, convention.prochainNumero, relatif, etape.sortieAttendue));
  } catch (erreur) {
    // Le fichier seul serait un orphelin : on préfère ne rien laisser.
    unlinkSync(cheminEtape);
    throw erreur;
  }
  return cheminEtape;
}

/**
 * Refuse une étape dont le titre existe déjà dans la séquence.
 *
 * C'est le garde-fou du double clic, et il vit ici plutôt que dans le bouton.
 * `doitEtreLibre` ne voyait rien : la seconde soumission relit le disque, voit
 * l'étape qui vient d'être créée, vise le numéro suivant — et fabrique
 * `etape-02-relecture.md` puis `etape-03-relecture.md`, deux fichiers dont les
 * noms diffèrent d'un chiffre. Un bouton grisé n'aurait pas suffi : un onglet
 * rouvert, un renvoi après délai d'attente, et le doublon revient.
 */
function refuserUnDoublon(workflow: Workflow, slug: string): void {
  const existante = workflow.etapes.find((e) => slugDuFichier(e.fichierDeclare) === slug);
  if (!existante) return;

  throw new EcritureRefusee(
    `Une étape porte déjà ce titre — l'étape ${existante.numero}, « ${existante.role} ». ` +
      "Choisis-en un autre, ou modifie celle qui existe.",
  );
}

/** `etapes/etape-02-le-grand-menage.md` → `le-grand-menage`. */
function slugDuFichier(fichierDeclare: string): string {
  return basename(fichierDeclare, ".md").replace(/^.*?-\d+-/, "");
}

function squelette(numero: string, titre: string, sortie: string): string {
  return [
    `# Étape ${numero} — ${titre}`,
    "",
    `**Sortie attendue** : ${sortie.trim() || "à écrire."}`,
    "",
    "## Ce que tu fais",
    "",
    "À écrire.",
    "",
  ].join("\n");
}

const LIGNE_ETAPE = /^\|\s*\d+\s*\|\s*[^|]*`[^`]+\.md`[^|]*\|/;

/**
 * Insère la ligne juste après la dernière ligne d'étape du tableau.
 *
 * On ne réécrit pas le tableau : on y ajoute une ligne. Le reste du fichier,
 * séparateurs et alignements compris, ressort octet pour octet.
 */
function avecLigneAjoutee(skill: string, numero: string, relatif: string, sortie: string): string {
  const lignes = skill.split("\n");
  let derniere = -1;
  for (let i = 0; i < lignes.length; i++) {
    if (LIGNE_ETAPE.test(lignes[i])) derniere = i;
  }
  if (derniere === -1) throw new EcritureRefusee("Aucun tableau d'étapes n'a été trouvé dans ce SKILL.md.");

  const role = sortie.trim().replace(/\|/g, "\\|") || "À écrire";
  lignes.splice(derniere + 1, 0, `| ${numero} | \`${relatif}\` | ${role} |`);
  return lignes.join("\n");
}

const DOSSIER_RETIREES = "retirees";

export interface DescriptionDuRetrait {
  numero: string;
  role: string;
  /** Le fichier tel qu'il est aujourd'hui, en absolu. */
  source: string;
  /** Où il ira, en absolu. Null si le fichier est déjà absent. */
  destination: string | null;
  /** La ligne du tableau qui disparaîtra, mot pour mot. */
  ligneTableau: string;
  /** À reposter pour confirmer : lie ce qui est montré à ce qui sera écrit. */
  empreinte: string;
}

/**
 * Ce qui serait retiré, sans rien retirer.
 *
 * Le premier temps de la confirmation. Les chemins sont rendus en absolu :
 * quelqu'un qui découvre l'outil doit voir le fichier qu'il vise, pas un nom
 * relatif à un dossier qu'il ne connaît pas.
 */
export function decrireRetrait(
  cheminSkill: string,
  workflow: Workflow,
  numero: string,
): DescriptionDuRetrait {
  const absolu = cheminModifiable(cheminSkill);
  const etape = trouverEtape(workflow, numero);
  const skill = lireTexte(absolu);
  if (skill === null) throw new EcritureRefusee("Le SKILL.md est introuvable.");

  const ligne = skill
    .split("\n")
    .find((l) => LIGNE_ETAPE.test(l) && l.includes(`\`${etape.fichierDeclare}\``));
  if (!ligne) {
    throw new EcritureRefusee(`La ligne de « ${etape.fichierDeclare} » est introuvable dans le tableau.`);
  }

  return {
    numero: etape.numero,
    role: etape.role,
    source: etape.cheminAbsolu,
    destination: etape.present
      ? join(dirname(absolu), DOSSIER_RETIREES, basename(etape.cheminAbsolu))
      : null,
    ligneTableau: ligne.trim(),
    empreinte: empreinteDeFichiers([absolu, etape.cheminAbsolu]),
  };
}

function trouverEtape(workflow: Workflow, numero: string) {
  const etape = workflow.etapes.find((e) => e.numero === numero);
  if (!etape) throw new EcritureRefusee(`Aucune étape ${numero} dans ce workflow.`);
  return etape;
}

/**
 * Retire une étape : la ligne quitte le tableau, le fichier quitte la séquence.
 *
 * Le fichier n'est pas effacé mais déplacé dans un dossier `retirees/` voisin.
 * Un dossier `.claude` d'utilisateur n'est pas toujours sous Git — `halo` ne
 * l'est pas — et un effacement y serait irrécupérable. `retirees/` n'est pas le
 * dossier d'étapes : rien n'y est signalé comme orphelin.
 *
 * Rend le chemin où le fichier a été déplacé, ou null s'il n'existait pas.
 */
export function retirerEtape(
  cheminSkill: string,
  workflow: Workflow,
  numero: string,
  empreinteAttendue?: string,
): string | null {
  const absolu = cheminModifiable(cheminSkill);
  const etape = trouverEtape(workflow, numero);

  if (empreinteAttendue && empreinteDeFichiers([absolu, etape.cheminAbsolu]) !== empreinteAttendue) {
    throw new EcritureRefusee(DIVERGENCE);
  }

  const skill = lireTexte(absolu);
  if (skill === null) throw new EcritureRefusee("Le SKILL.md est introuvable.");

  const sansLigne = sansLaLigne(skill, etape.fichierDeclare);
  if (sansLigne === skill) {
    throw new EcritureRefusee(`La ligne de « ${etape.fichierDeclare} » est introuvable dans le tableau.`);
  }

  const destination = etape.present ? deplacerHorsSequence(absolu, etape.cheminAbsolu) : null;
  try {
    ecrireAtomiquement(absolu, sansLigne);
  } catch (erreur) {
    if (destination) renameSync(destination, etape.cheminAbsolu);
    throw erreur;
  }
  return destination;
}

function sansLaLigne(skill: string, fichierDeclare: string): string {
  const lignes = skill.split("\n");
  const index = lignes.findIndex((l) => LIGNE_ETAPE.test(l) && l.includes(`\`${fichierDeclare}\``));
  if (index === -1) return skill;
  lignes.splice(index, 1);
  return lignes.join("\n");
}

function deplacerHorsSequence(cheminSkill: string, cheminEtape: string): string {
  cheminModifiable(cheminEtape);
  const destination = join(dirname(cheminSkill), DOSSIER_RETIREES, basename(cheminEtape));
  doitEtreLibre(destination);
  mkdirSync(dirname(destination), { recursive: true });
  renameSync(cheminEtape, destination);
  return destination;
}

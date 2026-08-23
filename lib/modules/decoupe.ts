/**
 * Le découpage d'un corps de fichier en modules lisibles.
 *
 * Un SKILL.md ou un agent n'est pas une masse de texte : c'est un frontmatter
 * et une suite de sections, dont certaines sont des listes ordonnées. L'éditeur
 * les montre telles quelles plutôt que dans un champ de saisie géant.
 *
 * La propriété qui commande tout : **recomposer ce qu'on a découpé doit rendre
 * le fichier d'origine, octet pour octet**. Un découpage qui normalise au
 * passage — une ligne vide en trop, une numérotation refaite — détruirait du
 * texte écrit à la main dès la première proposition appliquée.
 */

export type Forme = "texte" | "liste";

export interface Module {
  /** Identité stable d'un rendu à l'autre, pour relier une proposition. */
  cle: string;
  titre: string;
  forme: Forme;
  /** Les entrées d'une liste, sans leur numéro. Vide pour de la prose. */
  entrees: string[];
  /** La prose, sans ses lignes vides de bordure. Vide pour une liste. */
  texte: string;
  /** D'où vient le module dans le fichier : `## étapes · ordonnées`. */
  origine: string;
  /** Le texte brut, titre compris. C'est lui qui garantit le retour. */
  brut: string;
}

const TITRE_SECTION = /^##\s+(.+?)\s*$/;
const TITRE_FICHIER = /^#\s+(.+?)\s*$/;
const ENTREE_NUMEROTEE = /^\s*\d+[.)]\s+(.*)$/;

export function decouperCorps(corps: string): Module[] {
  if (corps.trim() === "") return [];

  const lignes = corps.split("\n");
  const titres = lignes.flatMap((l, i) => (TITRE_SECTION.test(l) ? [i] : []));
  const premier = titres[0] ?? lignes.length;

  const tranches = [
    ...(premier > 0 ? [lignes.slice(0, premier)] : []),
    ...titres.map((debut, i) => lignes.slice(debut, titres[i + 1] ?? lignes.length)),
  ];

  return tranches.map((tranche, index) => enModule(tranche, index));
}

/** Le chemin inverse : les modules remis bout à bout, sans rien ajouter. */
export function recomposerCorps(modules: Module[]): string {
  return modules.map((m) => m.brut).join("\n");
}

function enModule(tranche: string[], index: number): Module {
  const entete = TITRE_SECTION.exec(tranche[0] ?? "");
  const corps = entete ? tranche.slice(1) : sansTitreDeFichier(tranche);
  const titre = entete ? entete[1] : titreDePreambule(tranche);

  const entrees = corps
    .filter((l) => l.trim() !== "")
    .map((l) => ENTREE_NUMEROTEE.exec(l))
    .filter((t): t is RegExpExecArray => t !== null)
    .map((t) => t[1]);

  // Une seule entrée ne fait pas une liste : ce serait donner l'air d'une
  // séquence à un paragraphe qui commence par « 1. ».
  const estListe = entrees.length > 1 && entrees.length === corps.filter((l) => l.trim() !== "").length;

  return {
    cle: `${index}:${slug(titre)}`,
    titre,
    forme: estListe ? "liste" : "texte",
    entrees: estListe ? entrees : [],
    texte: estListe ? "" : corps.join("\n").trim(),
    origine: origineDe(entete !== null, titre, estListe),
    brut: tranche.join("\n"),
  };
}

/** Le `# Titre` d'ouverture nomme le préambule ; il n'en fait pas partie. */
function sansTitreDeFichier(tranche: string[]): string[] {
  const index = tranche.findIndex((l) => l.trim() !== "");
  return index !== -1 && TITRE_FICHIER.test(tranche[index]) ? tranche.slice(index + 1) : tranche;
}

function titreDePreambule(tranche: string[]): string {
  const ligne = tranche.find((l) => l.trim() !== "") ?? "";
  return TITRE_FICHIER.exec(ligne)?.[1] ?? "Corps";
}

/**
 * L'étiquette de provenance, en mono, à droite du titre du module.
 *
 * Elle dit où le module vit dans le fichier — c'est ce qui permet de vérifier
 * ce qu'Orcha a compris sans ouvrir l'éditeur de texte.
 */
function origineDe(estSection: boolean, titre: string, estListe: boolean): string {
  if (!estSection) return "en tête de fichier";
  const nom = titre.toLowerCase();
  if (!estListe) return `## ${nom}`;
  return `## ${nom} · ${nom.endsWith("s") ? "ordonnées" : "ordonnée"}`;
}

function slug(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

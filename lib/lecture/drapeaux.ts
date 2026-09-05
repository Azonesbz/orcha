/**
 * Les drapeaux d'un workflow, et ce qu'ils changent à la séquence.
 *
 * `giva-flow` déclare ses modes dans un tableau — une ligne par drapeau, une
 * cellule qui dit les étapes : « 0 → 8, étapes 4 et 6 sautées », « 0 → 2 puis
 * STOP », « 0, 1, 6 puis STOP ». C'est cette cellule qu'on lit, telle qu'elle
 * est écrite. Un drapeau sans cellule d'étapes (`--front`, `--full-auto`) est
 * listé pour ce qu'il est : un paramètre orthogonal, qui ne touche pas au plan.
 *
 * Fonction pure sur le corps du SKILL.md et les numéros du tableau : rien
 * n'est deviné hors d'une ligne de tableau, la prose ne compte pas.
 */

export interface Drapeau {
  drapeau: string;
  mode: string;
  /** Les étapes qui restent, dans l'ordre du tableau. Null : la séquence ne change pas. */
  actives: string[] | null;
  /** La dernière étape, quand le mode s'arrête avant la fin. */
  finAnticipee: string | null;
  effet: string;
}

const LIGNE = /^\|(.+)\|\s*$/;
const DRAPEAU = /`(--[a-z][a-z0-9-]*)`/g;
/** « , étapes 4 et 6 sautées » ou « puis STOP » : ce qui suit la plage. */
const COUPURE = /,\s*(?=étapes?\b)|\s+puis\s+/i;
const PLAGE = /(\d+)\s*(?:→|->|à)\s*(\d+)/;

export function lireDrapeaux(corps: string, numeros: string[]): Drapeau[] {
  const parDrapeau = new Map<string, Drapeau>();
  for (const ligne of corps.split("\n")) {
    const cellules = LIGNE.exec(ligne)?.[1].split("|").map((c) => c.trim());
    if (!cellules) continue;
    for (const lu of deLaLigne(cellules, numeros)) {
      const connu = parDrapeau.get(lu.drapeau);
      // La ligne des modes gagne sur une simple mention dans un autre tableau.
      if (!connu || (connu.actives === null && lu.actives !== null)) parDrapeau.set(lu.drapeau, lu);
    }
  }
  return [...parDrapeau.values()];
}

function deLaLigne(cellules: string[], numeros: string[]): Drapeau[] {
  const indexDrapeaux = cellules.findIndex((c) => drapeauxDans(c).length > 0);
  if (indexDrapeaux === -1) return [];

  const etapes = cellules
    .map((c, i) => (i === indexDrapeaux ? null : lireEtapes(c, numeros)))
    .find((e) => e !== null) ?? null;
  const effet = sansEmphase(cellules.at(-1) ?? "");

  return drapeauxDans(cellules[indexDrapeaux]).map((drapeau) => ({
    drapeau,
    mode: indexDrapeaux > 0 ? sansEmphase(cellules[0]) : drapeau.replace(/^--/, ""),
    actives: etapes?.actives ?? null,
    finAnticipee: etapes?.fin ?? null,
    effet,
  }));
}

function drapeauxDans(cellule: string): string[] {
  return [...cellule.matchAll(DRAPEAU)].map((t) => t[1]);
}

/** Une plage ou une liste, et rien d'autre : « 0 → 8 », « 0, 1, 6 ». */
const QUE_DES_NUMEROS = /^[\d\s,→>\-à]+(?:et[\d\s,]+)*$/;

/**
 * « 0 → 8, étapes 4 et 6 sautées » → les étapes qui restent, et où ça finit.
 *
 * La tête doit n'être faite que de numéros : une cellule d'effet qui dit
 * « corrigée à l'étape 2 » contient un chiffre, et n'est pas une séquence.
 */
function lireEtapes(cellule: string, numeros: string[]): { actives: string[]; fin: string | null } | null {
  const texte = sansEmphase(cellule);
  const [tete, ...suites] = texte.split(COUPURE);
  if (!QUE_DES_NUMEROS.test(tete.trim()) || !/\d/.test(tete)) return null;

  let actives = plageOuListe(tete, numeros);
  if (actives.length === 0) return null;

  let fin: string | null = null;
  for (const suite of suites) {
    if (/saut/i.test(suite)) {
      const exclues = new Set(resoudre(nombres(suite), numeros));
      actives = actives.filter((n) => !exclues.has(n));
    }
    if (/\bstop\b|arr[êe]t/i.test(suite)) fin = actives.at(-1) ?? null;
  }
  return { actives, fin };
}

function plageOuListe(tete: string, numeros: string[]): string[] {
  const plage = PLAGE.exec(tete);
  if (plage) {
    const [debut, fin] = [Number(plage[1]), Number(plage[2])];
    return numeros.filter((n) => Number(n) >= debut && Number(n) <= fin);
  }
  return resoudre(nombres(tete), numeros);
}

function nombres(texte: string): number[] {
  return [...texte.matchAll(/\d+/g)].map((t) => Number(t[0]));
}

/** Les numéros du tableau, dans son ordre — « 4 » vaut « 04 ». */
function resoudre(valeurs: number[], numeros: string[]): string[] {
  const voulus = new Set(valeurs);
  return numeros.filter((n) => voulus.has(Number(n)));
}

function sansEmphase(texte: string): string {
  return texte.replace(/\*\*|\*|`/g, "").trim();
}

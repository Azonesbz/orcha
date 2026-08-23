/**
 * Ce qui a bougé entre le corps sur le disque et celui que Claude propose.
 *
 * Le modèle rend un corps entier — c'est le seul format qu'on peut lui
 * demander sans dépendre d'une syntaxe d'opérations qu'il tiendrait mal. La
 * granularité du bloc se déduit ici, par comparaison : c'est fiable, et ça ne
 * repose sur rien d'autre que les deux textes.
 */

import { decouperCorps, type Module } from "./decoupe.ts";

export type Sorte = "ajout" | "retrait" | "modification";

export interface Changement {
  /** Le module concerné, par son titre — c'est ce que l'écran affiche. */
  titre: string;
  sorte: Sorte;
  /** La position dans la liste, sur deux chiffres. Nul hors d'une liste. */
  position: string | null;
  /** L'index dans le module proposé, pour la surbrillance. Nul en retrait. */
  index: number | null;
  texte: string;
}

export function comparerCorps(avant: string, apres: string): Changement[] {
  const anciens = new Map(decouperCorps(avant).map((m) => [m.titre, m]));
  const nouveaux = decouperCorps(apres);
  const vus = new Set<string>();

  const changements = nouveaux.flatMap((module) => {
    vus.add(module.titre);
    const ancien = anciens.get(module.titre);
    return ancien ? changementsDuModule(ancien, module) : [moduleEntier(module, "ajout")];
  });

  const retires = [...anciens.values()]
    .filter((m) => !vus.has(m.titre))
    .map((m) => moduleEntier(m, "retrait"));

  return [...changements, ...retires];
}

function moduleEntier(module: Module, sorte: Sorte): Changement {
  return {
    titre: module.titre,
    sorte,
    position: null,
    index: sorte === "retrait" ? null : 0,
    texte: module.forme === "liste" ? module.entrees.join(" · ") : module.texte,
  };
}

function changementsDuModule(avant: Module, apres: Module): Changement[] {
  if (avant.forme === "liste" && apres.forme === "liste") {
    return changementsDeListe(avant.entrees, apres.entrees, apres.titre);
  }
  if (avant.texte === apres.texte && avant.forme === apres.forme) return [];
  return [
    {
      titre: apres.titre,
      sorte: "modification",
      position: null,
      // 1 et non 0 : la prose d'un module commence sous son titre, et l'index
      // sert à situer la surbrillance dans le module rendu.
      index: 1,
      texte: apres.forme === "liste" ? apres.entrees.join(" · ") : apres.texte,
    },
  ];
}

/**
 * Les entrées ajoutées ou retirées d'une liste, jamais les entrées décalées.
 *
 * Comparer position par position ferait passer une insertion en tête pour une
 * réécriture de toute la liste. La plus longue sous-séquence commune sépare ce
 * qui a bougé de ce qui n'a fait que descendre d'un cran.
 */
function changementsDeListe(avant: string[], apres: string[], titre: string): Changement[] {
  const communes = plusLongueSousSequence(avant, apres);
  const changements: Changement[] = [];
  let a = 0;
  let b = 0;

  for (const commune of [...communes, null]) {
    while (b < apres.length && apres[b] !== commune) {
      changements.push(bloc(titre, "ajout", b, apres[b]));
      b++;
    }
    while (a < avant.length && avant[a] !== commune) {
      changements.push(bloc(titre, "retrait", null, avant[a]));
      a++;
    }
    a++;
    b++;
  }
  return changements;
}

/**
 * Les lignes du texte proposé qui n'existaient pas avant, par leur index.
 *
 * Sert à la surbrillance de l'aperçu : montrer *où* la proposition atterrit
 * dans le fichier vaut mieux qu'un diff à part, qu'il faudrait relire deux
 * fois pour situer.
 */
export function lignesNouvelles(avant: string, apres: string): number[] {
  const lignesApres = apres.split("\n");
  const communes = plusLongueSousSequence(avant.split("\n"), lignesApres);

  const nouvelles: number[] = [];
  let i = 0;
  for (const commune of communes) {
    while (i < lignesApres.length && lignesApres[i] !== commune) nouvelles.push(i++);
    i++;
  }
  while (i < lignesApres.length) nouvelles.push(i++);
  return nouvelles;
}

function bloc(titre: string, sorte: Sorte, index: number | null, texte: string): Changement {
  return {
    titre,
    sorte,
    position: index === null ? null : String(index + 1).padStart(2, "0"),
    index,
    texte,
  };
}

/** Programmation dynamique classique — les listes d'un module tiennent en dizaines. */
function plusLongueSousSequence(a: string[], b: string[]): string[] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const commune: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      commune.push(a[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return commune;
}

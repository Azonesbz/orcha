/**
 * Ce que Claude propose doit se lire comme des blocs, pas comme un diff.
 *
 * Le modèle rend un corps entier ; c'est ici qu'on en déduit ce qui a
 * réellement bougé. Une insertion au milieu d'une liste ne doit pas faire
 * apparaître toutes les entrées suivantes comme modifiées : ce serait noyer le
 * seul bloc qui compte.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { comparerCorps, lignesNouvelles } from "./difference.ts";

const AVANT = [
  "## Étapes",
  "",
  "1. Reformuler la décision en une phrase falsifiable.",
  "2. Lister les hypothèses implicites, une par ligne.",
  "3. Rendre un verdict.",
  "",
  "## Arrêt",
  "",
  "Si la décision engage plus d'une journée, s'arrêter.",
  "",
].join("\n");

test("un corps inchangé ne propose aucun bloc", () => {
  // Arrange
  const apres = AVANT;

  // Act
  const changements = comparerCorps(AVANT, apres);

  // Assert
  assert.deepEqual(changements, []);
});

test("une entrée insérée au milieu ne signale qu'un bloc, à sa position", () => {
  // Arrange
  const apres = AVANT.replace(
    "3. Rendre un verdict.",
    "3. Vérifier chaque chiffre cité à sa source.\n4. Rendre un verdict.",
  );

  // Act
  const changements = comparerCorps(AVANT, apres);

  // Assert
  assert.equal(changements.length, 1);
  assert.deepEqual(changements[0], {
    titre: "Étapes",
    sorte: "ajout",
    position: "03",
    index: 2,
    texte: "Vérifier chaque chiffre cité à sa source.",
  });
});

test("une entrée retirée est signalée en retrait, sans index dans le module proposé", () => {
  // Arrange
  const apres = AVANT.replace("2. Lister les hypothèses implicites, une par ligne.\n", "").replace(
    "3. Rendre",
    "2. Rendre",
  );

  // Act
  const changements = comparerCorps(AVANT, apres);

  // Assert
  assert.equal(changements.length, 1);
  assert.equal(changements[0].sorte, "retrait");
  assert.equal(changements[0].index, null);
});

test("une section de prose réécrite est signalée en modification", () => {
  // Arrange
  const apres = AVANT.replace("Si la décision engage plus d'une journée, s'arrêter.", "Ne jamais s'arrêter.");

  // Act
  const changements = comparerCorps(AVANT, apres);

  // Assert
  assert.deepEqual(changements, [
    { titre: "Arrêt", sorte: "modification", position: null, index: 1, texte: "Ne jamais s'arrêter." },
  ]);
});

test("une section entière ajoutée est signalée comme un seul bloc", () => {
  // Arrange
  const apres = `${AVANT}\n## Sortie\n\nRendre le verdict en trois lignes.\n`;

  // Act
  const changements = comparerCorps(AVANT, apres);

  // Assert
  assert.equal(changements.length, 1);
  assert.equal(changements[0].titre, "Sortie");
  assert.equal(changements[0].sorte, "ajout");
  assert.equal(changements[0].position, null);
});

test("une section entière retirée est signalée en retrait", () => {
  // Arrange
  const apres = AVANT.slice(0, AVANT.indexOf("## Arrêt"));

  // Act
  const changements = comparerCorps(AVANT, apres);

  // Assert
  assert.equal(changements.length, 1);
  assert.equal(changements[0].titre, "Arrêt");
  assert.equal(changements[0].sorte, "retrait");
});

test("les lignes nouvelles se repèrent par leur index dans le texte proposé", () => {
  // Arrange
  const avant = "un\ndeux\ntrois";
  const apres = "un\ndeux et demi\ndeux\ntrois";

  // Act
  const nouvelles = lignesNouvelles(avant, apres);

  // Assert
  assert.deepEqual(nouvelles, [1]);
});

test("un texte identique n'a aucune ligne nouvelle", () => {
  // Arrange
  const texte = "un\ndeux";

  // Act
  const nouvelles = lignesNouvelles(texte, texte);

  // Assert
  assert.deepEqual(nouvelles, []);
});

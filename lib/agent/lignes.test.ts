/**
 * Le découpage d'un flux en lignes, côté navigateur.
 *
 * Un bloc réseau ne s'arrête pas là où une ligne finit : il coupe au milieu
 * d'un JSON une fois sur deux. Sans ce tampon, l'écran perdait un geste sur
 * deux — et silencieusement, puisqu'un JSON tronqué s'ignore.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { decouper } from "./lignes.ts";

test("un bloc entier rend ses lignes et ne garde rien", () => {
  // Arrange
  const bloc = '{"a":1}\n{"a":2}\n';

  // Act
  const { lignes, reste } = decouper("", bloc);

  // Assert
  assert.deepEqual(lignes, ['{"a":1}', '{"a":2}']);
  assert.equal(reste, "");
});

test("une ligne coupée en deux blocs se recolle", () => {
  // Arrange — le cas qui perdait un geste sur deux.
  const premier = decouper("", '{"sorte":"lec');

  // Act
  const second = decouper(premier.reste, 'ture"}\n');

  // Assert
  assert.deepEqual(premier.lignes, []);
  assert.deepEqual(second.lignes, ['{"sorte":"lecture"}']);
  assert.equal(second.reste, "");
});

test("ce qui suit la dernière coupure attend le bloc suivant", () => {
  // Arrange
  const bloc = '{"a":1}\n{"a":2';

  // Act
  const { lignes, reste } = decouper("", bloc);

  // Assert
  assert.deepEqual(lignes, ['{"a":1}']);
  assert.equal(reste, '{"a":2');
});

test("les lignes vides ne remontent pas", () => {
  // Arrange
  const bloc = "\n\n{\"a\":1}\n\n";

  // Act
  const { lignes } = decouper("", bloc);

  // Assert
  assert.deepEqual(lignes, ['{"a":1}']);
});

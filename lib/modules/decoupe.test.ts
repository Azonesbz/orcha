/**
 * Un fichier se lit en modules — et le découpage ne doit rien perdre.
 *
 * La règle qui compte : ce qui entre doit pouvoir ressortir identique. Un
 * module qui « nettoie » son texte au passage ferait perdre du contenu écrit à
 * la main dès la première proposition appliquée.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { decouperCorps, recomposerCorps } from "./decoupe.ts";

const GRILLING = [
  "## Étapes",
  "",
  "1. Reformuler la décision en une phrase falsifiable.",
  "2. Lister les hypothèses implicites, une par ligne.",
  "3. Chercher le contre-exemple le moins coûteux.",
  "",
  "## Arrêt",
  "",
  "Si la décision engage plus d'une journée de travail, s'arrêter et demander.",
  "",
].join("\n");

test("chaque titre de niveau 2 devient un module, dans l'ordre du fichier", () => {
  // Arrange
  const corps = GRILLING;

  // Act
  const modules = decouperCorps(corps);

  // Assert
  assert.deepEqual(
    modules.map((m) => m.titre),
    ["Étapes", "Arrêt"],
  );
});

test("une section faite d'une liste numérotée est de forme « liste », sans ses numéros", () => {
  // Arrange
  const corps = GRILLING;

  // Act
  const etapes = decouperCorps(corps)[0];

  // Assert
  assert.equal(etapes.forme, "liste");
  assert.deepEqual(etapes.entrees, [
    "Reformuler la décision en une phrase falsifiable.",
    "Lister les hypothèses implicites, une par ligne.",
    "Chercher le contre-exemple le moins coûteux.",
  ]);
});

test("une section de prose reste de forme « texte »", () => {
  // Arrange
  const corps = GRILLING;

  // Act
  const arret = decouperCorps(corps)[1];

  // Assert
  assert.equal(arret.forme, "texte");
  assert.equal(arret.texte, "Si la décision engage plus d'une journée de travail, s'arrêter et demander.");
});

test("la prose d'ouverture, avant tout titre de niveau 2, forme son propre module", () => {
  // Arrange
  const corps = ["# Grilling", "", "Passer au gril un plan.", "", "## Étapes", "", "1. Reformuler.", ""].join("\n");

  // Act
  const modules = decouperCorps(corps);

  // Assert
  assert.equal(modules[0].titre, "Grilling");
  assert.equal(modules[0].forme, "texte");
  assert.equal(modules[0].texte, "Passer au gril un plan.");
});

test("recomposer ce qui a été découpé rend le corps d'origine, octet pour octet", () => {
  // Arrange
  const corps = GRILLING;

  // Act
  const refait = recomposerCorps(decouperCorps(corps));

  // Assert
  assert.equal(refait, corps);
});

test("un corps vide ne donne aucun module plutôt qu'un module vide", () => {
  // Arrange
  const corps = "\n\n";

  // Act
  const modules = decouperCorps(corps);

  // Assert
  assert.deepEqual(modules, []);
});

test("une liste d'un seul élément reste de la prose : un élément ne fait pas une liste", () => {
  // Arrange
  const corps = ["## Note", "", "1. Un seul point.", ""].join("\n");

  // Act
  const modules = decouperCorps(corps);

  // Assert
  assert.equal(modules[0].forme, "texte");
});

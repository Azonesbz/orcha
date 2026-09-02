/**
 * Le nettoyage de la suite rendue par le modèle.
 *
 * L'appel lui-même n'est pas testé — c'est le réseau, comme `proposition.ts`.
 * Ce qui se teste, c'est ce qu'on accepte d'afficher : la consigne dit « une
 * phrase, sans guillemets », le modèle la respecte à peu près, et le champ ne
 * doit jamais montrer le à-peu-près.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { nettoyer } from "./suites.ts";

test("les guillemets dont le modèle enrobe sa phrase disparaissent", () => {
  // Arrange
  const brut = '« Montre le diff »';

  // Act
  const suite = nettoyer(brut);

  // Assert
  assert.equal(suite, "Montre le diff");
});

test("seule la première ligne est retenue", () => {
  // Arrange — le modèle ajoute parfois une justification en dessous.
  const brut = "Applique à l'étape 6\n\nCar elle produit le rapport.";

  // Act
  const suite = nettoyer(brut);

  // Assert
  assert.equal(suite, "Applique à l'étape 6");
});

test("le mot VIDE veut dire « rien à proposer »", () => {
  // Arrange — c'est la sortie que la consigne réserve aux suites génériques.
  const brut = "VIDE";

  // Act
  const suite = nettoyer(brut);

  // Assert
  assert.equal(suite, "");
});

test("une phrase entière est écartée : on voulait quelques mots", () => {
  // Arrange — la consigne demande un raccourci, le modèle rend parfois une
  // phrase complète. Elle passerait à la ligne dans le champ.
  const brut = "Est-ce que tu peux me montrer les changements exacts dans le fichier ?";

  // Act
  const suite = nettoyer(brut);

  // Assert
  assert.equal(suite, "", "un indice coupé au milieu vaut moins que pas d'indice");
});

test("une sortie vide ne rend rien plutôt que d'échouer", () => {
  // Arrange & Act & Assert
  assert.equal(nettoyer("   \n  "), "");
});

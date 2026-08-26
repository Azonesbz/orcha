/**
 * Le contrat unique des garde-fous d'écriture.
 *
 * Six fichiers d'actions serveur s'appuient dessus. Sur le déploiement public,
 * ces actions restent joignables — l'image compile tout le dépôt, et un layout
 * qui rend un 404 ne garde pas une Server Action, adressée par son identifiant
 * de build. Elles viseraient alors le disque du serveur. La porte se ferme donc
 * ici, au contrat, et non dans chacun des écrans.
 */

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ecritureOuverte } from "./etat.ts";

afterEach(() => {
  delete process.env.ATELIER_PUBLIC;
});

test("sur la machine de l'utilisateur, l'écriture est ouverte", async () => {
  // Arrange
  delete process.env.ATELIER_PUBLIC;

  // Act
  const ouverte = await ecritureOuverte();

  // Assert
  assert.equal(ouverte, true);
});

test("sur le déploiement public, l'écriture est fermée", async () => {
  // Arrange
  process.env.ATELIER_PUBLIC = "1";

  // Act
  const ouverte = await ecritureOuverte();

  // Assert
  assert.equal(ouverte, false);
});

/**
 * Lancer le CLI, et rapporter son échec de façon lisible.
 *
 * Deux pièges appris en production. `claude -p` attend sur stdin s'il n'est pas
 * fermé : trois secondes perdues, puis l'échec. Et l'erreur d'un
 * `child_process` recopie TOUTE la ligne de commande — ici, l'invite complète
 * avec le fichier qu'on vient de lui donner. L'écran affichait donc au visage
 * de l'utilisateur ce qu'il venait d'envoyer.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messageDEchec } from "./lancement.ts";

test("l'échec dit la cause, jamais la ligne de commande", () => {
  // Arrange — la forme exacte que rend child_process.
  const brut = [
    "Command failed: claude -p Audite ce workflow",
    "",
    "--- Contexte : Plan du workflow giva-flow ---",
    "Séquence : 00, 01, 02… (deux cents lignes de fichier)",
    "Vraie cause : model not found",
  ].join("\n");

  // Act
  const dit = messageDEchec(brut, 1);

  // Assert
  assert.doesNotMatch(dit, /Contexte/, "l'invite renvoyée serait illisible");
  assert.doesNotMatch(dit, /Command failed/);
  assert.match(dit, /model not found/);
});

test("un stderr vide laisse quand même une phrase utile", () => {
  // Arrange
  const brut = "";

  // Act
  const dit = messageDEchec(brut, 3);

  // Assert
  assert.match(dit, /3/, "le code de sortie est la seule information restante");
});

test("l'avertissement sur stdin n'est pas une cause d'échec", () => {
  // Arrange — il apparaît même quand tout va bien, il ne doit pas être rapporté
  // comme la raison.
  const brut = [
    "Warning: no stdin data received in 3s, proceeding without it.",
    "Erreur réelle : quota dépassé",
  ].join("\n");

  // Act
  const dit = messageDEchec(brut, 1);

  // Assert
  assert.doesNotMatch(dit, /stdin/);
  assert.match(dit, /quota dépassé/);
});

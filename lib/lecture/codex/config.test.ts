/**
 * `config.toml` : ce qu'Orcha en retient, et la confiance accordée au projet.
 *
 * Un projet non approuvé est le silence le plus large de Codex : tout son
 * dossier `.codex` est ignoré. La lecture doit donc savoir le dire.
 */

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lireConfigCodex, projetApprouve } from "./config.ts";

function racineAvec(config: string | null): string {
  const racine = mkdtempSync(join(tmpdir(), "codex-config-"));
  if (config !== null) writeFileSync(join(racine, "config.toml"), config, "utf8");
  return racine;
}

test("le modèle, la politique d'approbation et le bac à sable sont lus", () => {
  // Arrange
  const racine = racineAvec(
    `model = "gpt-5.5"\napproval_policy = "never"\nsandbox_mode = "danger-full-access"\n\n[projects."/tmp/a"]\ntrust_level = "trusted"\n`,
  );

  // Act
  const config = lireConfigCodex(racine);

  // Assert
  assert.equal(config.modele, "gpt-5.5");
  assert.equal(config.approbation, "never");
  assert.equal(config.bacASable, "danger-full-access");
  assert.deepEqual(config.projetsApprouves, ["/tmp/a"]);
  assert.equal(config.erreur, null);
});

test("un projet est approuvé par lui-même ou par un de ses parents", () => {
  // Arrange
  const config = lireConfigCodex(racineAvec(`[projects."/Users/x/workspace"]\ntrust_level = "trusted"\n`));

  // Act & Assert
  assert.equal(projetApprouve(config, "/Users/x/workspace/bpm"), true);
  assert.equal(projetApprouve(config, "/Users/x/autre"), false);
});

test("une config illisible rend des valeurs vides et dit pourquoi", () => {
  // Arrange
  const racine = racineAvec(`model = "gpt\n`);

  // Act
  const config = lireConfigCodex(racine);

  // Assert
  assert.equal(config.modele, "");
  assert.ok(config.erreur, "l'erreur doit être portée, pas avalée");
});

test("une config absente n'est pas une erreur", () => {
  // Arrange
  const racine = racineAvec(null);

  // Act
  const config = lireConfigCodex(racine);

  // Assert
  assert.equal(config.presente, false);
  assert.equal(config.erreur, null);
});

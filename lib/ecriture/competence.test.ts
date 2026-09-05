/**
 * Le garde d'une compétence : trois refus, avant toute écriture.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { verifierChemin } from "./competence.ts";

function racineJetable(): string {
  const racine = mkdtempSync(join(tmpdir(), "competence-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  process.env.ATELIER_PROJET = racine;
  return racine;
}

test("un SKILL.md sous la racine est accepté, en absolu", () => {
  // Arrange
  const racine = racineJetable();
  mkdirSync(join(racine, "skills", "grilling"), { recursive: true });
  writeFileSync(join(racine, "skills", "grilling", "SKILL.md"), "---\nname: grilling\n---\n", "utf8");

  // Act & Assert
  assert.equal(verifierChemin(join(racine, "skills", "grilling", "SKILL.md")), join(racine, "skills", "grilling", "SKILL.md"));
});

test("une compétence de plugin est refusée", () => {
  // Arrange
  const racine = racineJetable();

  // Act & Assert
  assert.throws(() => verifierChemin(join(racine, "plugins", "cache", "x", "skills", "y", "SKILL.md")), /plugin/i);
});

test("un fichier hors des racines connues est refusé", () => {
  // Arrange
  racineJetable();

  // Act & Assert
  assert.throws(() => verifierChemin("/ailleurs/skills/x/SKILL.md"), /hors des dossiers/i);
});

test("un fichier qui n'est pas un SKILL.md est refusé", () => {
  // Arrange
  const racine = racineJetable();

  // Act & Assert
  assert.throws(() => verifierChemin(join(racine, "skills", "x", "notes.md")), /SKILL\.md/);
});

/**
 * Le dépôt Git qui contient un dossier : sa racine, sa branche, et si l'arbre
 * est propre. C'est ce que l'agent doit savoir avant d'écrire.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { depotDe } from "./depot.ts";

/** Un dépôt jetable sur `main`, avec un premier commit. */
function depotJetable(): string {
  const racine = mkdtempSync(join(tmpdir(), "depot-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", racine, "-c", "user.name=Orcha", "-c", "user.email=orcha@test", ...args], { stdio: "pipe" });
  git("init", "-q", "-b", "main");
  writeFileSync(join(racine, "README.md"), "# Test\n", "utf8");
  git("add", "README.md");
  git("commit", "-q", "-m", "init");
  return racine;
}

test("un dossier dans un dépôt donne sa racine et sa branche", () => {
  // Arrange
  const racine = depotJetable();
  mkdirSync(join(racine, ".claude", "skills"), { recursive: true });

  // Act
  const depot = depotDe(join(racine, ".claude", "skills"));

  // Assert
  assert.equal(depot?.racine, realpathSync(racine));
  assert.equal(depot?.branche, "main");
  assert.equal(depot?.propre, true);
});

test("un arbre modifié n'est pas propre", () => {
  // Arrange
  const racine = depotJetable();
  writeFileSync(join(racine, "brouillon.md"), "en cours\n", "utf8");

  // Act
  const depot = depotDe(racine);

  // Assert
  assert.equal(depot?.propre, false);
});

test("hors d'un dépôt, rien", () => {
  // Arrange
  const dossier = mkdtempSync(join(tmpdir(), "nu-"));

  // Act & Assert
  assert.equal(depotDe(dossier), null);
});

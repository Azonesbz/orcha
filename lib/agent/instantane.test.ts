/**
 * Le filet, puisque la relecture avant écriture a été retirée.
 *
 * L'agent écrit directement dans `.claude`, qui n'est pas un dépôt git : sans
 * instantané, une modification ratée est définitive. Ce qui compte ici n'est pas
 * de copier — c'est de RENDRE le dossier tel qu'il était, y compris en
 * supprimant ce que l'agent a créé entre-temps.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { listerInstantanes, prendreInstantane, restaurer } from "./instantane.ts";

/** Un dossier de travail, plus un ~/.orcha jetable où ranger les instantanés. */
function terrain(): string {
  process.env.ORCHA_CONFIG = join(mkdtempSync(join(tmpdir(), "orcha-maison-")), "config.json");
  const dossier = mkdtempSync(join(tmpdir(), "orcha-travail-"));
  mkdirSync(join(dossier, "etapes"), { recursive: true });
  writeFileSync(join(dossier, "SKILL.md"), "---\nname: essai\n---\n\nCorps.\n", "utf8");
  writeFileSync(join(dossier, "etapes", "etape-00.md"), "# Étape 00\n", "utf8");
  return dossier;
}

test("restaurer rend chaque fichier à l'octet près", () => {
  // Arrange
  const dossier = terrain();
  const avant = readFileSync(join(dossier, "SKILL.md"), "utf8");
  const instantane = prendreInstantane(dossier);

  // Act
  writeFileSync(join(dossier, "SKILL.md"), "Tout autre chose.\n", "utf8");
  restaurer(instantane.id);

  // Assert
  assert.equal(readFileSync(join(dossier, "SKILL.md"), "utf8"), avant);
});

test("un fichier créé après l'instantané disparaît à la restauration", () => {
  // Arrange — c'est LE cas qui compte : un agent qui crée trois étapes de trop
  // laisse un workflow incohérent, et les effacer une à une est le geste qu'on
  // veut éviter à l'utilisateur.
  const dossier = terrain();
  const instantane = prendreInstantane(dossier);

  // Act
  writeFileSync(join(dossier, "etapes", "etape-99-intruse.md"), "# Intruse\n", "utf8");
  restaurer(instantane.id);

  // Assert
  assert.equal(existsSync(join(dossier, "etapes", "etape-99-intruse.md")), false);
});

test("un fichier supprimé par l'agent revient", () => {
  // Arrange
  const dossier = terrain();
  const instantane = prendreInstantane(dossier);

  // Act
  rmSync(join(dossier, "etapes", "etape-00.md"));
  restaurer(instantane.id);

  // Assert
  assert.equal(readFileSync(join(dossier, "etapes", "etape-00.md"), "utf8"), "# Étape 00\n");
});

test("l'instantané retient d'où il vient : restaurer ne demande que son identité", () => {
  // Arrange
  const dossier = terrain();

  // Act
  const instantane = prendreInstantane(dossier);

  // Assert
  assert.equal(instantane.dossier, dossier);
  assert.ok(instantane.id.length > 0);
  assert.deepEqual(
    listerInstantanes().map((i) => i.id),
    [instantane.id],
  );
});

test("restaurer une identité inconnue est refusé plutôt que silencieux", () => {
  // Arrange
  terrain();

  // Act
  const geste = () => restaurer("jamais-pris");

  // Assert
  assert.throws(geste, /introuvable/i);
});

test("deux instantanés du même dossier ne se marchent pas dessus", () => {
  // Arrange
  const dossier = terrain();
  const premier = prendreInstantane(dossier);
  writeFileSync(join(dossier, "SKILL.md"), "Version deux.\n", "utf8");

  // Act
  const second = prendreInstantane(dossier);
  restaurer(premier.id);

  // Assert
  assert.notEqual(premier.id, second.id);
  assert.equal(readFileSync(join(dossier, "SKILL.md"), "utf8"), "---\nname: essai\n---\n\nCorps.\n");
});

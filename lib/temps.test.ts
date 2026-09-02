import assert from "node:assert/strict";
import { test } from "node:test";
import { duree } from "./temps.ts";

test("une durée se dit en minutes, puis en heures", () => {
  // Arrange
  const cas: Array<[number, string]> = [
    [20_000, "< 1 min"],
    [90_000, "2 min"],
    [59 * 60_000, "59 min"],
    [60 * 60_000, "1 h 00"],
    [127 * 60_000, "2 h 07"],
  ];

  // Act
  const dits = cas.map(([ms]) => duree(ms));

  // Assert — les minutes sont sur deux chiffres après l'heure : « 2 h 7 » se
  // lit mal en colonne, et la colonne est le seul endroit où ça sert.
  assert.deepEqual(dits, cas.map(([, attendu]) => attendu));
});

test("zéro se dit « < 1 min », jamais « 0 h 00 »", () => {
  // Arrange & Act
  const dit = duree(0);

  // Assert
  assert.equal(dit, "< 1 min");
});

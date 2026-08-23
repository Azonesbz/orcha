/**
 * « Vérifiée il y a deux minutes » — dit en français, et jamais au futur.
 *
 * L'horloge est passée en argument : une fonction qui lit `Date.now()` ne se
 * teste pas, et le rendu serveur et le rendu client donneraient deux textes
 * différents à une seconde d'intervalle.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { ilYA } from "./duree.ts";

const MAINTENANT = new Date("2026-08-23T12:00:00.000Z");

test("moins d'une minute se dit « à l'instant »", () => {
  // Arrange
  const quand = "2026-08-23T11:59:30.000Z";

  // Act
  const dit = ilYA(quand, MAINTENANT);

  // Assert
  assert.equal(dit, "à l'instant");
});

test("les minutes, les heures et les jours s'accordent au pluriel", () => {
  // Arrange
  const cas = [
    ["2026-08-23T11:59:00.000Z", "il y a 1 minute"],
    ["2026-08-23T11:58:00.000Z", "il y a 2 minutes"],
    ["2026-08-23T11:00:00.000Z", "il y a 1 heure"],
    ["2026-08-22T12:00:00.000Z", "il y a 1 jour"],
    ["2026-08-20T12:00:00.000Z", "il y a 3 jours"],
  ] as const;

  // Act
  const dits = cas.map(([quand]) => ilYA(quand, MAINTENANT));

  // Assert
  assert.deepEqual(dits, cas.map(([, attendu]) => attendu));
});

test("une date absente ou illisible ne rend rien plutôt qu'une date de 1970", () => {
  // Arrange
  const cas = ["", "pas une date"];

  // Act
  const dits = cas.map((quand) => ilYA(quand, MAINTENANT));

  // Assert
  assert.deepEqual(dits, ["", ""]);
});

test("une date au futur — horloge décalée — se dit « à l'instant », jamais « dans »", () => {
  // Arrange
  const quand = "2026-08-23T12:05:00.000Z";

  // Act
  const dit = ilYA(quand, MAINTENANT);

  // Assert
  assert.equal(dit, "à l'instant");
});

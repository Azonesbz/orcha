/**
 * Le lissage : un paquet de texte arrive d'un coup, l'écran le déroule mot à
 * mot. Ici la seule règle qui compte — où couper — et la cadence qui en découle.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { avancer, motsRestants, pasDeRevelation } from "./lissage.ts";

const TEXTE = "Orcha est une application locale, sans compte.";

test("avancer d'un mot s'arrête après le mot, jamais au milieu", () => {
  // Arrange & Act
  const coupe = avancer(TEXTE, 0, 1);

  // Assert
  assert.equal(TEXTE.slice(0, coupe), "Orcha");
});

test("avancer de trois mots emporte les blancs qui les séparent", () => {
  // Arrange & Act
  const coupe = avancer(TEXTE, 0, 3);

  // Assert
  assert.equal(TEXTE.slice(0, coupe), "Orcha est une");
});

test("avancer reprend là où on en était", () => {
  // Arrange
  const premiere = avancer(TEXTE, 0, 2);

  // Act
  const seconde = avancer(TEXTE, premiere, 2);

  // Assert
  assert.equal(TEXTE.slice(premiere, seconde), " une application");
});

test("avancer au-delà de la fin s'arrête à la fin, sans planter", () => {
  // Arrange & Act
  const coupe = avancer(TEXTE, 0, 50);

  // Assert
  assert.equal(coupe, TEXTE.length);
});

test("les mots restants se comptent depuis la coupe", () => {
  // Arrange
  const coupe = avancer(TEXTE, 0, 2);

  // Act & Assert
  assert.equal(motsRestants(TEXTE, coupe), 5);
  assert.equal(motsRestants(TEXTE, TEXTE.length), 0);
});

test("le pas suit le retard : un mot quand il n'y a rien, davantage quand un paquet attend", () => {
  // Arrange — un paquet d'une seconde fait une quarantaine de mots ; il doit
  // se dérouler avant que le suivant n'arrive.
  // Act & Assert
  assert.equal(pasDeRevelation(3), 1, "trois mots : un par tic, pas de hâte");
  assert.ok(pasDeRevelation(40) >= 2, "quarante mots : plus d'un par tic");
  assert.ok(pasDeRevelation(400) > pasDeRevelation(40), "le retard accélère");
});

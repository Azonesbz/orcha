/**
 * Les arguments passés au CLI — la seule frontière où l'écriture se décide.
 *
 * L'agent d'Orcha écrit directement : ce qui l'empêche de sortir du périmètre,
 * c'est cette ligne de commande et rien d'autre. On la teste donc en la
 * construisant, sans lancer quoi que ce soit — un test qui lancerait un agent
 * pour vérifier qu'il n'écrit pas serait exactement le mauvais test.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { argumentsDeLAgent } from "./agent.ts";
import { refuserSiSessionMorte } from "./proposition.ts";

const CONTEXTE = {
  titre: "Plan du workflow lancer",
  resume: "Séquence : 00, 01, 02.",
  dossier: "/Users/x/.claude/skills/lancer",
  peutEcrire: true,
  suggestions: [],
};

test("en lecture seule, ni Edit ni Write ne sont accordés", () => {
  // Arrange
  const contexte = { ...CONTEXTE, peutEcrire: false };

  // Act
  const args = argumentsDeLAgent(contexte, "Audite ce workflow", "claude-opus-5");

  // Assert
  const outils = args[args.indexOf("--allowedTools") + 1];
  assert.doesNotMatch(outils, /Edit|Write/);
  assert.match(outils, /Read/);
});

test("en écriture, Edit et Write sont accordés — et rien de plus", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5");

  // Assert
  const outils = args[args.indexOf("--allowedTools") + 1];
  assert.match(outils, /Edit/);
  assert.match(outils, /Write/);
  assert.doesNotMatch(outils, /Bash/, "un agent qui lance des commandes sort du périmètre");
});

test("le périmètre passé au CLI est celui du contexte, jamais la machine entière", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5");

  // Assert
  assert.equal(args[args.indexOf("--add-dir") + 1], CONTEXTE.dossier);
});

test("l'instruction et le contexte partent ensemble, sous -p", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite ce workflow", "claude-opus-5");

  // Assert
  const invite = args[args.indexOf("-p") + 1];
  assert.match(invite, /Audite ce workflow/);
  assert.match(invite, /Séquence : 00, 01, 02/);
});

test("la doctrine du produit accompagne chaque appel", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5");

  // Assert
  const doctrine = args[args.indexOf("--append-system-prompt") + 1];
  assert.match(doctrine, /plugin/i, "ne jamais écrire dans un plugin");
  assert.match(doctrine, /étape/i, "une étape déclarée a toujours son fichier");
});

test("le modèle demandé est celui passé", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite", "claude-haiku-4-5");

  // Assert
  assert.equal(args[args.indexOf("--model") + 1], "claude-haiku-4-5");
});

test("une session morte est un refus, pas une réponse", () => {
  // Arrange — le CLI l'écrit sur stdout avec un code de retour 0 : sans ce
  // contrôle, l'échec s'affiche comme si le modèle l'avait dit.
  const sortie = "Failed to authenticate: OAuth session expired and could not be refreshed";

  // Act
  const geste = () => refuserSiSessionMorte(sortie);

  // Assert
  assert.throws(geste, /expirée/i);
});

test("une réponse normale passe sans encombre", () => {
  // Arrange
  const sortie = "Ce workflow déclare 7 étapes, dont une sans fichier.";

  // Act
  refuserSiSessionMorte(sortie);

  // Assert
  assert.ok(true, "aucune levée attendue");
});

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
import { enClair, refuserSiSessionMorte } from "./proposition.ts";

const SESSION = "11111111-2222-3333-4444-555555555555";

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
  const args = argumentsDeLAgent(contexte, "Audite ce workflow", "claude-opus-5", SESSION, true);

  // Assert
  const outils = args[args.indexOf("--allowedTools") + 1];
  assert.doesNotMatch(outils, /Edit|Write/);
  assert.match(outils, /Read/);
});

test("en écriture, Edit et Write sont accordés — et rien de plus", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

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
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--add-dir") + 1], CONTEXTE.dossier);
});

test("l'instruction et le contexte partent ensemble, sous -p", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite ce workflow", "claude-opus-5", SESSION, true);

  // Assert
  const invite = args[args.indexOf("-p") + 1];
  assert.match(invite, /Audite ce workflow/);
  assert.match(invite, /Séquence : 00, 01, 02/);
});

test("la doctrine du produit accompagne chaque appel", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  const doctrine = args[args.indexOf("--append-system-prompt") + 1];
  assert.match(doctrine, /plugin/i, "ne jamais écrire dans un plugin");
  assert.match(doctrine, /étape/i, "une étape déclarée a toujours son fichier");
});

test("le modèle demandé est celui passé", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite", "claude-haiku-4-5", SESSION, true);

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

test("une session expirée remontée par le lanceur se dit en français, avec le geste", () => {
  // Arrange — ce que `lancerClaude` rejette réellement, vérifié en conditions.
  const erreur = new Error("Failed to authenticate: OAuth session expired and could not be refreshed");

  // Act
  const dit = enClair(erreur);

  // Assert
  assert.match(dit, /expirée/);
  assert.match(dit, /terminal/, "il faut dire quoi faire, pas seulement ce qui cloche");
});

test("le premier tour ouvre la session et porte le contexte", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--session-id") + 1], SESSION);
  assert.equal(args.includes("--resume"), false);
  assert.match(args[args.indexOf("-p") + 1], /Séquence : 00, 01, 02/);
});

test("les tours suivants reprennent la session, sans réexpédier le contexte", () => {
  // Arrange — le CLI tient l'historique : le renvoyer à chaque tour gonflerait
  // l'invite et ferait relire à l'agent ce qu'il sait déjà.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Et l'étape 02 ?", "claude-opus-5", SESSION, false);

  // Assert
  assert.equal(args[args.indexOf("--resume") + 1], SESSION);
  assert.equal(args.includes("--session-id"), false);
  const invite = args[args.indexOf("-p") + 1];
  assert.equal(invite, "Et l'étape 02 ?");
  assert.doesNotMatch(invite, /Séquence/);
});

test("la doctrine n'est envoyée qu'à l'ouverture", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const suite = argumentsDeLAgent(contexte, "Et ensuite ?", "claude-opus-5", SESSION, false);

  // Assert
  assert.equal(suite.includes("--append-system-prompt"), false);
});

test("changer d'écran en cours de conversation rappelle le nouveau contexte", () => {
  // Arrange — la discussion suit l'utilisateur : on ne repart pas de zéro,
  // on lui dit où il regarde maintenant.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Et ici ?", "claude-opus-5", SESSION, false, true);

  // Assert
  assert.equal(args[args.indexOf("--resume") + 1], SESSION, "la même conversation continue");
  assert.match(args[args.indexOf("-p") + 1], /Je regarde maintenant/);
  assert.match(args[args.indexOf("-p") + 1], /Séquence : 00, 01, 02/);
});

test("un mode est imposé : en `-p`, aucun humain ne peut répondre à une invite", () => {
  // Arrange — sans mode, l'agent restait suspendu à la première écriture.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args.includes("--permission-mode"), true);
});

test("Bash et les outils réseau restent refusés en toutes circonstances", () => {
  // Arrange — c'est ce refus, et non l'invite, qui borne désormais le
  // périmètre. Une liste d'autorisés seule ne suffirait plus.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  const refuses = args[args.indexOf("--disallowedTools") + 1];
  assert.match(refuses, /Bash/);
  assert.match(refuses, /WebFetch/);
  assert.match(refuses, /Task/);
});

test("le dossier reste borné, quel que soit le mode", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--add-dir") + 1], CONTEXTE.dossier);
});

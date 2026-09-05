/**
 * Un agent Markdown en TOML — lisible par Codex, et par un humain.
 *
 * Les consignes font des dizaines de lignes : elles s'écrivent entre `'''`,
 * comme Codex les écrit lui-même, et non sur une ligne pleine de `\n`. La
 * preuve est une relecture par l'analyseur TOML, jamais une comparaison de
 * texte.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "smol-toml";
import { agentEnToml } from "./agent-toml.ts";

test("le TOML produit se relit avec les mêmes valeurs", () => {
  // Arrange
  const agent = { nom: "verifier", description: 'Valide "tout".', modele: "gpt-5.5", corps: "Ligne 1\n\nLigne \\ 2\n" };

  // Act
  const lu = parse(agentEnToml(agent));

  // Assert
  assert.equal(lu.name, "verifier");
  assert.equal(lu.description, 'Valide "tout".');
  assert.equal(lu.model, "gpt-5.5");
  assert.equal(lu.developer_instructions, "Ligne 1\n\nLigne \\ 2\n");
});

test("les consignes s'écrivent en littéral multiligne, pas en une ligne échappée", () => {
  // Arrange
  const agent = { nom: "a", description: "D.", modele: "", corps: "Un\nDeux\n" };

  // Act
  const toml = agentEnToml(agent);

  // Assert
  assert.match(toml, /developer_instructions = '''\nUn\nDeux\n'''/);
  assert.ok(!toml.includes("model ="), "un modèle vide ne s'écrit pas : Codex prend celui de la session");
});

test("un corps qui contient déjà trois apostrophes retombe sur une chaîne échappée, toujours relisible", () => {
  // Arrange
  const agent = { nom: "a", description: "D.", modele: "", corps: "x = '''y'''\n" };

  // Act
  const lu = parse(agentEnToml(agent));

  // Assert
  assert.equal(lu.developer_instructions, "x = '''y'''\n");
});

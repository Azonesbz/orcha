/**
 * Les agents Codex : un fichier TOML, trois champs obligatoires.
 *
 * `name`, `description` et `developer_instructions` sont requis par la
 * documentation. Un fichier qui en manque un est là et ne sert à rien — c'est
 * l'écart qu'Orcha existe pour montrer.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lireAgentsCodex } from "./agents.ts";

function racineAvec(fichiers: Record<string, string>): string {
  const racine = mkdtempSync(join(tmpdir(), "codex-agents-"));
  mkdirSync(join(racine, "agents"), { recursive: true });
  for (const [nom, contenu] of Object.entries(fichiers)) {
    writeFileSync(join(racine, "agents", nom), contenu, "utf8");
  }
  return racine;
}

test("un agent TOML complet est lu sous son name, avec ses consignes pour corps", () => {
  // Arrange
  const racine = racineAvec({
    "verifier.toml": `name = "verifier"\ndescription = '''Valide le travail.'''\nmodel = "gpt-5.5"\ndeveloper_instructions = '''Tu es le vérificateur.\n\nRelis.'''\n`,
  });

  // Act
  const [agent] = lireAgentsCodex(racine, "utilisateur", "~/.codex");

  // Assert
  assert.equal(agent.nom, "verifier");
  assert.equal(agent.description, "Valide le travail.");
  assert.equal(agent.modele, "gpt-5.5");
  assert.match(agent.corps, /Tu es le vérificateur/);
  assert.deepEqual(agent.silences, []);
});

test("un TOML illisible reste listé, marqué illisible", () => {
  // Arrange
  const racine = racineAvec({ "casse.toml": `name = "casse\ndescription = 'x'\n` });

  // Act
  const [agent] = lireAgentsCodex(racine, "utilisateur", "~/.codex");

  // Assert
  assert.equal(agent.nom, "casse");
  assert.equal(agent.silences[0]?.cause, "TOML illisible");
});

test("un agent sans description ni consignes porte un silence par champ manquant", () => {
  // Arrange
  const racine = racineAvec({ "muet.toml": `name = "muet"\n` });

  // Act
  const [agent] = lireAgentsCodex(racine, "projet", ".codex");

  // Assert
  const causes = agent.silences.map((s) => s.cause);
  assert.ok(causes.includes("aucune description"), causes.join(", "));
  assert.ok(causes.includes("aucune developer_instructions"), causes.join(", "));
});

/**
 * Les prompts Codex : l'équivalent des commandes, avec une règle de plus.
 *
 * Codex ne lit que le premier niveau de `prompts/`. Un fichier rangé dans un
 * sous-dossier est là, et jamais proposé — là où Claude Code en ferait un
 * espace de noms.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lirePrompts } from "./prompts.ts";

function racineAvec(fichiers: Record<string, string>): string {
  const racine = mkdtempSync(join(tmpdir(), "codex-prompts-"));
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(join(racine, "prompts", chemin, ".."), { recursive: true });
    writeFileSync(join(racine, "prompts", chemin), contenu, "utf8");
  }
  return racine;
}

test("un prompt au premier niveau est lu sous le nom de son fichier", () => {
  // Arrange
  const racine = racineAvec({
    "flow.md": "---\ndescription: Pipeline.\nargument-hint: <demande>\n---\n\n$ARGUMENTS\n",
  });

  // Act
  const [prompt] = lirePrompts(racine, "utilisateur", "~/.codex");

  // Assert
  assert.equal(prompt.nom, "flow");
  assert.equal(prompt.description, "Pipeline.");
  assert.equal(prompt.indiceArgument, "<demande>");
  assert.deepEqual(prompt.silences, []);
});

test("un prompt dans un sous-dossier est listé, mais signalé comme jamais proposé", () => {
  // Arrange
  const racine = racineAvec({ "giva/cadrer.md": "---\ndescription: Cadre.\n---\n\nCorps.\n" });

  // Act
  const [prompt] = lirePrompts(racine, "projet", ".codex");

  // Assert
  assert.equal(prompt.nom, "giva/cadrer");
  assert.equal(prompt.silences[0]?.cause, "dans un sous-dossier");
});

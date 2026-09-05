/**
 * Les plugins Codex : `[plugins."nom@marketplace"] enabled = true` d'un côté,
 * une copie dans `plugins/cache/<marketplace>/<nom>/` de l'autre. La même
 * soustraction que pour Claude Code — le déclaré moins le présent.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lirePluginsCodex } from "./plugins.ts";

function racineAvec(config: string, copies: string[]): string {
  const racine = mkdtempSync(join(tmpdir(), "codex-plugins-"));
  writeFileSync(join(racine, "config.toml"), config, "utf8");
  for (const copie of copies) {
    const dossier = join(racine, "plugins", "cache", copie, "1.0.0", ".codex-plugin");
    mkdirSync(dossier, { recursive: true });
    writeFileSync(join(dossier, "plugin.json"), "{}", "utf8");
  }
  return racine;
}

test("un plugin activé dont la copie est là charge, sans silence", () => {
  // Arrange
  const racine = racineAvec(`[plugins."browser@openai-bundled"]\nenabled = true\n`, ["openai-bundled/browser"]);

  // Act
  const [plugin] = lirePluginsCodex(racine);

  // Assert
  assert.equal(plugin.identifiant, "browser@openai-bundled");
  assert.equal(plugin.marketplace, "openai-bundled");
  assert.equal(plugin.active, true);
  assert.equal(plugin.present, true);
  assert.deepEqual(plugin.silences, []);
});

test("un plugin activé sans copie est déclaré sans effet", () => {
  // Arrange
  const racine = racineAvec(`[plugins."pdf@openai-primary-runtime"]\nenabled = true\n`, []);

  // Act
  const [plugin] = lirePluginsCodex(racine);

  // Assert
  assert.equal(plugin.present, false);
  assert.equal(plugin.silences.length, 1);
});

test("un plugin désactivé n'est pas un écart, copie ou pas", () => {
  // Arrange
  const racine = racineAvec(`[plugins."pdf@openai-primary-runtime"]\nenabled = false\n`, []);

  // Act
  const [plugin] = lirePluginsCodex(racine);

  // Assert
  assert.equal(plugin.active, false);
  assert.deepEqual(plugin.silences, []);
});

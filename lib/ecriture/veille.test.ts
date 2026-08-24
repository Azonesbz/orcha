/**
 * Installer le hook de veille — dans le dossier de l'utilisateur, pas dans le
 * paquet.
 *
 * Ce qui est en jeu ici, c'est `settings.json` : un fichier que l'utilisateur a
 * écrit à la main, où vivent ses plugins, ses variables et ses autres hooks.
 * Une installation qui le reformate, écrase une clé ou perd un hook voisin est
 * un échec, même si le hook de veille finit par se déclencher.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { installerVeille, MODULES_DU_HOOK } from "./veille.ts";

/** Un ~/.claude jetable, plus un dossier source qui ressemble au paquet. */
function terrain(reglages: unknown): { racine: string; source: string } {
  const racine = mkdtempSync(join(tmpdir(), "veille-ecrit-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  delete process.env.ATELIER_PROJET;
  if (reglages !== undefined) {
    writeFileSync(join(racine, "settings.json"), JSON.stringify(reglages, null, 2), "utf8");
  }

  const source = mkdtempSync(join(tmpdir(), "veille-source-"));
  for (const nom of MODULES_DU_HOOK) writeFileSync(join(source, nom), `# ${nom}\n`, "utf8");
  return { racine, source };
}

function reglagesDe(racine: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(racine, "settings.json"), "utf8"));
}

test("le hook et ses modules sont copiés dans le dossier de l'utilisateur", () => {
  // Arrange
  const { racine, source } = terrain({});

  // Act
  const fait = installerVeille(source);

  // Assert
  for (const nom of MODULES_DU_HOOK) {
    assert.equal(readFileSync(join(racine, "hooks", "orcha", nom), "utf8"), `# ${nom}\n`);
  }
  assert.equal(fait.chemin, join(racine, "hooks", "orcha", "hook.py"));
});

test("la commande écrite pointe sur la copie, jamais sur le paquet", () => {
  // Arrange
  const { racine, source } = terrain({});

  // Act
  installerVeille(source);

  // Assert
  const commande = String(
    ((reglagesDe(racine).hooks as any).SessionStart[0].hooks[0] as any).command,
  );
  assert.ok(commande.includes(join(racine, "hooks", "orcha", "hook.py")));
  assert.ok(!commande.includes(source), "le chemin du paquet bouge à chaque mise à jour");
});

test("les autres clés des réglages ne sont pas touchées", () => {
  // Arrange
  const { racine, source } = terrain({
    env: { UNE: "valeur" },
    enabledPlugins: { "giva@marketplace": true },
  });

  // Act
  installerVeille(source);

  // Assert
  const lu = reglagesDe(racine);
  assert.deepEqual(lu.env, { UNE: "valeur" });
  assert.deepEqual(lu.enabledPlugins, { "giva@marketplace": true });
});

test("un SessionStart qui appartient à quelqu'un d'autre survit à l'installation", () => {
  // Arrange
  const autre = { hooks: [{ type: "command", command: "echo bonjour" }] };
  const { racine, source } = terrain({ hooks: { SessionStart: [autre] } });

  // Act
  installerVeille(source);

  // Assert
  const groupes = (reglagesDe(racine).hooks as any).SessionStart;
  assert.equal(groupes.length, 2);
  assert.equal(groupes[0].hooks[0].command, "echo bonjour");
});

test("un autre événement que SessionStart survit lui aussi", () => {
  // Arrange
  const { racine, source } = terrain({
    hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "echo avant" }] }] },
  });

  // Act
  installerVeille(source);

  // Assert
  assert.ok((reglagesDe(racine).hooks as any).PreToolUse, "PreToolUse doit rester");
});

test("installer deux fois ne crée pas deux entrées", () => {
  // Arrange
  const { racine, source } = terrain({});
  installerVeille(source);

  // Act
  installerVeille(source);

  // Assert
  const groupes = (reglagesDe(racine).hooks as any).SessionStart;
  assert.equal(groupes.length, 1);
});

test("un `hooks` mal formé qui ne contient que notre hook est réparé", () => {
  // Arrange — le piège du bloc collé un cran trop bas, à réparer sans rien perdre.
  const { racine, source } = terrain({
    hooks: [{ type: "command", command: "python3 /ailleurs/hook.py", timeout: 10 }],
  });

  // Act
  installerVeille(source);

  // Assert
  const groupes = (reglagesDe(racine).hooks as any).SessionStart;
  assert.equal(groupes.length, 1);
});

test("un `hooks` mal formé qui contient autre chose est refusé, pas écrasé", () => {
  // Arrange
  const { racine, source } = terrain({
    hooks: [{ type: "command", command: "echo quelque chose a moi" }],
  });

  // Act
  const geste = () => installerVeille(source);

  // Assert
  assert.throws(geste, /hooks/);
  assert.deepEqual(reglagesDe(racine).hooks, [
    { type: "command", command: "echo quelque chose a moi" },
  ]);
});

test("un settings.json illisible est refusé avant toute écriture", () => {
  // Arrange
  const racine = mkdtempSync(join(tmpdir(), "veille-ecrit-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  writeFileSync(join(racine, "settings.json"), "{ pas du JSON", "utf8");
  const source = mkdtempSync(join(tmpdir(), "veille-source-"));
  for (const nom of MODULES_DU_HOOK) writeFileSync(join(source, nom), "#\n", "utf8");

  // Act
  const geste = () => installerVeille(source);

  // Assert
  assert.throws(geste, /JSON/);
});

test("une source incomplète est refusée : mieux vaut rien qu'un hook qui plante", () => {
  // Arrange
  const { source } = terrain({});
  mkdirSync(join(source, "vide"), { recursive: true });
  writeFileSync(join(source, "hook.py"), "#\n", "utf8");
  const amputee = mkdtempSync(join(tmpdir(), "veille-amputee-"));
  writeFileSync(join(amputee, "hook.py"), "#\n", "utf8");

  // Act
  const geste = () => installerVeille(amputee);

  // Assert
  assert.throws(geste, /ecart\.py|introuvable|incomplet/i);
});

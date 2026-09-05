/**
 * La conversion écrit ce que le plan montre, et n'écrase jamais rien.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parse } from "smol-toml";
import { convertir } from "./convertir.ts";

function terrain(): { maison: string; projet: string } {
  const maison = mkdtempSync(join(tmpdir(), "conv-maison-"));
  const projet = mkdtempSync(join(tmpdir(), "conv-projet-"));
  for (const d of [join(maison, ".claude"), join(maison, ".codex"), join(projet, ".claude")]) mkdirSync(d, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = join(maison, ".claude");
  process.env.CODEX_HOME = join(maison, ".codex");
  process.env.ATELIER_PROJET = projet;
  return { maison, projet };
}

function poser(chemin: string, contenu: string): void {
  mkdirSync(join(chemin, ".."), { recursive: true });
  writeFileSync(chemin, contenu, "utf8");
}

test("compétence, agent, commande et instructions sont écrits là où Codex les lit", () => {
  // Arrange
  const { maison } = terrain();
  const claude = join(maison, ".claude");
  poser(join(claude, "skills", "halo", "SKILL.md"), "---\nname: halo\n---\n");
  poser(join(claude, "skills", "halo", "steps", "step-00.md"), "# Étape 00\n");
  poser(join(claude, "agents", "verifier.md"), "---\nname: verifier\ndescription: V.\nmodel: opus\n---\n\nRelis tout.\n");
  poser(join(claude, "commands", "flow.md"), "---\ndescription: F.\n---\n$ARGUMENTS\n");
  poser(join(claude, "CLAUDE.md"), "# Règles\n");

  // Act
  const bilan = convertir("utilisateur");

  // Assert
  const codex = join(maison, ".codex");
  assert.equal(readFileSync(join(codex, "skills", "halo", "steps", "step-00.md"), "utf8"), "# Étape 00\n");
  const agent = parse(readFileSync(join(codex, "agents", "verifier.toml"), "utf8"));
  assert.deepEqual([agent.name, agent.description, agent.model, agent.developer_instructions], ["verifier", "V.", "opus", "Relis tout.\n"]);
  assert.equal(readFileSync(join(codex, "prompts", "flow.md"), "utf8"), "---\ndescription: F.\n---\n$ARGUMENTS\n");
  assert.equal(readFileSync(join(codex, "AGENTS.md"), "utf8"), "# Règles\n");
  assert.equal(bilan.ecrits.length, 4);
});

test("une destination qui existe est laissée intacte, et comptée comme telle", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "agents", "verifier.md"), "---\nname: verifier\ndescription: V.\n---\nNeuf.\n");
  poser(join(maison, ".codex", "agents", "verifier.toml"), "name = \"verifier\"\n# écrit à la main\n");

  // Act
  const bilan = convertir("utilisateur");

  // Assert
  assert.equal(readFileSync(join(maison, ".codex", "agents", "verifier.toml"), "utf8"), "name = \"verifier\"\n# écrit à la main\n");
  assert.deepEqual(bilan.ecrits, []);
  assert.equal(bilan.laisses, 1);
});

test("hooks.json ne reçoit que les hooks qui ne visent pas Claude Code, matcher compris", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "settings.json"), JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ type: "command", command: "python3 ~/.claude/hooks/orcha/hook.py", timeout: 10 }] }],
      PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo avant", timeout: 5 }] }],
    },
  }));

  // Act
  convertir("utilisateur");

  // Assert
  const lu = JSON.parse(readFileSync(join(maison, ".codex", "hooks.json"), "utf8"));
  assert.deepEqual(lu, { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo avant", timeout: 5 }] }] } });
});

test("au projet, les compétences vont dans .codex et AGENTS.md à la racine ; les commandes ne s'écrivent pas", () => {
  // Arrange
  const { projet } = terrain();
  poser(join(projet, ".claude", "skills", "lancer", "SKILL.md"), "---\nname: lancer\n---\n");
  poser(join(projet, ".claude", "commands", "idee.md"), "---\ndescription: I.\n---\n");
  poser(join(projet, "CLAUDE.md"), "# Vault\n");

  // Act
  const bilan = convertir("projet");

  // Assert
  assert.ok(existsSync(join(projet, ".codex", "skills", "lancer", "SKILL.md")));
  assert.equal(readFileSync(join(projet, "AGENTS.md"), "utf8"), "# Vault\n");
  assert.ok(!existsSync(join(projet, ".codex", "prompts")), "aucun prompt de projet chez Codex");
  assert.equal(bilan.sansEquivalent, 1);
});

test("convertir deux fois n'écrit rien la seconde fois", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "skills", "halo", "SKILL.md"), "---\nname: halo\n---\n");
  convertir("utilisateur");

  // Act
  const second = convertir("utilisateur");

  // Assert
  assert.deepEqual(second.ecrits, []);
  assert.equal(second.laisses, 1);
});

/**
 * La lecture complète d'un `.codex`, sur un terrain jetable.
 *
 * `CODEX_HOME` isole le dossier personnel, `ATELIER_PROJET` le projet, et le
 * `.agents` voisin est déduit du premier — comme `~/.agents` l'est de `~/.codex`.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lireAtelierCodex } from "./atelier.ts";

function terrain(): { maison: string; projet: string } {
  const maison = mkdtempSync(join(tmpdir(), "codex-maison-"));
  const projet = mkdtempSync(join(tmpdir(), "codex-projet-"));
  mkdirSync(join(maison, ".codex"), { recursive: true });
  mkdirSync(join(maison, ".claude"), { recursive: true });
  mkdirSync(join(projet, ".claude"), { recursive: true });
  mkdirSync(join(projet, ".codex"), { recursive: true });
  process.env.CODEX_HOME = join(maison, ".codex");
  process.env.CLAUDE_CONFIG_DIR = join(maison, ".claude");
  process.env.ATELIER_PROJET = projet;
  return { maison, projet };
}

function poserCompetence(dossier: string, nom: string): void {
  mkdirSync(join(dossier, "skills", nom), { recursive: true });
  writeFileSync(join(dossier, "skills", nom, "SKILL.md"), `---\nname: ${nom}\ndescription: D.\n---\nCorps.\n`, "utf8");
}

test("un projet dont le .codex n'est pas approuvé porte le silence le plus large", () => {
  // Arrange
  const { projet } = terrain();

  // Act
  const atelier = lireAtelierCodex();

  // Assert
  assert.equal(atelier.racineProjet, join(projet, ".codex"));
  assert.equal(atelier.silences[0]?.cause, "projet non approuvé");
});

test("les compétences de ~/.agents et du .agents du projet sont lues avec leur origine", () => {
  // Arrange
  const { maison, projet } = terrain();
  poserCompetence(join(maison, ".agents"), "perso");
  poserCompetence(join(projet, ".agents"), "local");
  poserCompetence(join(projet, ".codex"), "direct");

  // Act
  const atelier = lireAtelierCodex();

  // Assert
  const parNom = Object.fromEntries(atelier.competences.map((c) => [c.nom, c.origine]));
  assert.deepEqual(parNom, { perso: "~/.agents", local: ".agents", direct: ".codex" });
});

test("les hooks viennent de hooks.json comme du bloc [hooks] de config.toml", () => {
  // Arrange
  const { maison } = terrain();
  const codex = join(maison, ".codex");
  writeFileSync(join(codex, "hooks.json"), JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo a" }] }] } }), "utf8");
  writeFileSync(join(codex, "config.toml"), `[[hooks.Stop]]\n[[hooks.Stop.hooks]]\ntype = "command"\ncommand = "echo b"\n`, "utf8");

  // Act
  const atelier = lireAtelierCodex();

  // Assert
  assert.deepEqual(
    atelier.hooks.map((h) => [h.evenement, h.commande, h.origine]),
    [["SessionStart", "echo a", "hooks.json"], ["Stop", "echo b", "config.toml"]],
  );
});

test("AGENTS.md est l'instruction, à la maison comme au projet", () => {
  // Arrange
  const { maison, projet } = terrain();
  writeFileSync(join(maison, ".codex", "AGENTS.md"), "# Global\n", "utf8");
  writeFileSync(join(projet, "AGENTS.md"), "# Projet\n", "utf8");

  // Act
  const atelier = lireAtelierCodex();

  // Assert
  assert.deepEqual(atelier.instructions.map((i) => i.portee), ["utilisateur", "projet"]);
});

/**
 * Le plan de conversion : ce qui serait écrit, montré avant de l'être.
 *
 * Chaque objet d'un `.claude` a un sort chez Codex — copié tel quel, traduit,
 * déjà là, ou sans équivalent — et le plan doit le dire par ligne, avec la
 * raison. C'est la transformation la plus large de l'outil : elle ne s'écrit
 * qu'après s'être montrée.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { planifierConversion, type Operation } from "./plan.ts";

function terrain(): { maison: string; projet: string } {
  const maison = mkdtempSync(join(tmpdir(), "plan-maison-"));
  const projet = mkdtempSync(join(tmpdir(), "plan-projet-"));
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

const par = (ops: Operation[], genre: Operation["genre"]) => ops.filter((o) => o.genre === genre);

test("une compétence se copie, sauf si Codex la lit déjà quelque part", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "skills", "neuve", "SKILL.md"), "---\nname: neuve\n---\n");
  poser(join(maison, ".claude", "skills", "partagee", "SKILL.md"), "---\nname: partagee\n---\n");
  poser(join(maison, ".agents", "skills", "partagee", "SKILL.md"), "---\nname: partagee\n---\n");
  poser(join(maison, ".claude", "skills", "copiee", "SKILL.md"), "---\nname: copiee\n---\n");
  poser(join(maison, ".codex", "skills", "copiee", "SKILL.md"), "---\nname: copiee\n---\n");

  // Act
  const ops = par(planifierConversion("utilisateur").operations, "compétence");

  // Assert
  assert.deepEqual(
    ops.map((o) => [o.nom, o.statut]),
    [["copiee", "déjà là"], ["neuve", "à écrire"], ["partagee", "déjà là"]],
  );
  assert.equal(ops[1].destination, join(maison, ".codex", "skills", "neuve"));
  assert.match(ops[2].note, /\.agents/);
});

test("un agent Markdown devient un TOML, et son champ tools est signalé perdu", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "agents", "verif.md"), "---\nname: verifier\ndescription: V.\ntools: Read, Bash\n---\nCorps.\n");

  // Act
  const [op] = par(planifierConversion("utilisateur").operations, "agent");

  // Assert
  assert.equal(op.statut, "à écrire");
  assert.equal(op.destination, join(maison, ".codex", "agents", "verifier.toml"));
  assert.match(op.note, /tools/);
});

test("une commande personnelle devient un prompt, aplati si elle vivait dans un espace de noms", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "commands", "giva", "cadrer.md"), "---\ndescription: C.\n---\n$ARGUMENTS\n");

  // Act
  const [op] = par(planifierConversion("utilisateur").operations, "commande");

  // Assert
  assert.equal(op.destination, join(maison, ".codex", "prompts", "giva-cadrer.md"));
  assert.match(op.note, /prompts:giva-cadrer/);
});

test("une commande de projet n'a pas d'équivalent : Codex n'a pas de prompts de projet", () => {
  // Arrange
  const { projet } = terrain();
  poser(join(projet, ".claude", "commands", "lancer.md"), "---\ndescription: L.\n---\n");

  // Act
  const [op] = par(planifierConversion("projet").operations, "commande");

  // Assert
  assert.equal(op.statut, "sans équivalent");
});

test("un hook qui vise Claude Code n'est pas recopié ; les autres vont dans hooks.json", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "settings.json"), JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ type: "command", command: "python3 /x/.claude/hooks/orcha/hook.py" }] }],
      Stop: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo fini" }] }],
    },
  }));

  // Act
  const ops = par(planifierConversion("utilisateur").operations, "hook");

  // Assert
  assert.deepEqual(ops.map((o) => [o.nom, o.statut]), [["SessionStart", "sans équivalent"], ["Stop · Bash", "à écrire"]]);
  assert.equal(ops[1].destination, join(maison, ".codex", "hooks.json"));
});

test("CLAUDE.md devient AGENTS.md — dans ~/.codex pour le personnel, à la racine pour le projet", () => {
  // Arrange
  const { maison, projet } = terrain();
  poser(join(maison, ".claude", "CLAUDE.md"), "# Perso\n");
  poser(join(projet, "CLAUDE.md"), "# Projet\n");

  // Act
  const [perso] = par(planifierConversion("utilisateur").operations, "instructions");
  const [local] = par(planifierConversion("projet").operations, "instructions");

  // Assert
  assert.equal(perso.destination, join(maison, ".codex", "AGENTS.md"));
  assert.equal(local.destination, join(projet, "AGENTS.md"));
});

test("les permissions et les plugins sont comptés, et dits sans équivalent", () => {
  // Arrange
  const { maison } = terrain();
  poser(join(maison, ".claude", "settings.json"), JSON.stringify({
    permissions: { allow: ["Bash(npm test)"], deny: ["Read(.env)"] },
    enabledPlugins: { "giva@officiel": true },
  }));

  // Act
  const ops = planifierConversion("utilisateur").operations;

  // Assert
  assert.equal(par(ops, "permissions")[0]?.statut, "sans équivalent");
  assert.match(par(ops, "permissions")[0].nom, /2/);
  assert.match(par(ops, "plugins")[0].nom, /1/);
});

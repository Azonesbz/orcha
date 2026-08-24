/**
 * L'état du hook de veille, sur des réglages jetables.
 *
 * Ce qui compte : le bloc proposé porte le chemin de LA machine où l'outil
 * tourne, jamais celui de son auteur.
 */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lireVeille } from "./veille.ts";

function reglagesJetables(contenu: unknown): string {
  const racine = mkdtempSync(join(tmpdir(), "veille-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  writeFileSync(join(racine, "settings.json"), JSON.stringify(contenu), "utf8");
  return racine;
}

test("le bloc porte le chemin de la machine où l'outil tourne", () => {
  // Arrange
  reglagesJetables({});

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.chemin, join(process.cwd(), "hook.py"), "dérivé, jamais écrit");
  assert.ok(veille.bloc.includes(veille.chemin));
});

test("la source ne contient aucun chemin absolu de développeur", () => {
  // Arrange — l'assertion ne peut pas porter sur la valeur : chez l'auteur, le
  // chemin dérivé ressemble forcément au chemin de l'auteur. Elle porte donc
  // sur le code, où un chemin en dur serait une régression franche.
  const source = readFileSync(new URL("./veille.ts", import.meta.url), "utf8");

  // Act
  const enDur = source.match(/["'`](\/(?:Users|home)\/[^"'`]*)/g);

  // Assert
  assert.equal(enDur, null, `chemin absolu trouvé dans la source : ${enDur?.join(", ")}`);
});

test("un hook déjà en place est reconnu", () => {
  // Arrange
  reglagesJetables({
    hooks: {
      SessionStart: [{ hooks: [{ type: "command", command: `python3 ${join(process.cwd(), "hook.py")}` }] }],
    },
  });

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.installe, true);
  assert.equal(veille.autreHookPresent, false);
});

test("un SessionStart qui appartient à quelqu'un d'autre est signalé, pas écrasé", () => {
  // Arrange — un autre outil occupe déjà l'événement
  reglagesJetables({
    hooks: { SessionStart: [{ hooks: [{ type: "command", command: "cat ~/mon-memo.md" }] }] },
  });

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.installe, false);
  assert.equal(veille.autreHookPresent, true, "l'interface doit dire de fusionner, pas de remplacer");
});

test("des réglages sans hooks ne font pas tomber la lecture", () => {
  // Arrange
  reglagesJetables({ permissions: { allow: [] } });

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.installe, false);
  assert.equal(veille.autreHookPresent, false);
});

test("un `hooks` mal formé dit pourquoi, au lieu d'annoncer « pas installée »", () => {
  // Arrange — la forme exacte du piège : le bloc collé un cran trop bas, si
  // bien que `hooks` devient l'entrée elle-même au lieu du tableau d'événements.
  reglagesJetables({
    hooks: [{ type: "command", command: "python3 /ailleurs/hook.py", timeout: 10 }],
  });

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.installe, false);
  assert.match(veille.raison, /tableau/i, "la cause doit nommer la forme trouvée");
});

test("un `hooks` bien formé ne porte aucune raison : le silence est la normale", () => {
  // Arrange
  reglagesJetables({
    hooks: { SessionStart: [{ hooks: [{ type: "command", command: `python3 ${join(process.cwd(), "hook.py")}` }] }] },
  });

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.installe, true);
  assert.equal(veille.raison, "");
});

test("un settings.json illisible se dit, plutôt que de passer pour un hook absent", () => {
  // Arrange
  const racine = mkdtempSync(join(tmpdir(), "veille-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  writeFileSync(join(racine, "settings.json"), "{ ceci n'est pas du JSON", "utf8");

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.installe, false);
  assert.match(veille.raison, /lire|JSON/i);
});

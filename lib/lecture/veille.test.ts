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

test("le bloc porte le chemin de la COPIE, dans le dossier de l'utilisateur", () => {
  // Arrange — et non celui du paquet : un chemin de cache npx change à chaque
  // mise à jour, et le hook déclaré cesse alors de se déclencher en silence.
  const racine = reglagesJetables({});

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.cheminInstalle, join(racine, "hooks", "orcha", "hook.py"));
  assert.ok(veille.bloc.includes(veille.cheminInstalle), "dérivé, jamais écrit");
  assert.ok(!veille.bloc.includes(process.cwd()), "le paquet n'a rien à faire dans le bloc");
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

test("un hook déclaré ailleurs que sur la copie est distingué d'un hook en place", () => {
  // Arrange — le cas du paquet npx : le chemin déclaré a existé, puis le cache
  // a été vidé. Déclaré n'est pas installé, et ce n'est pas la même réparation.
  reglagesJetables({
    hooks: {
      SessionStart: [
        { hooks: [{ type: "command", command: "python3 /tmp/npx-perime/hook.py" }] },
      ],
    },
  });

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(veille.installe, true, "une commande hook.py EST déclarée");
  assert.equal(veille.declareAilleurs, true, "mais pas sur la copie de ~/.claude");
  assert.equal(veille.copieEnPlace, false);
});

test("la présence de python3 est constatée, pas supposée", () => {
  // Arrange — le hook est un script Python, et la page publique promet que Node
  // suffit. L'écran doit donc dire ce qu'il en est sur CETTE machine.
  reglagesJetables({});

  // Act
  const veille = lireVeille();

  // Assert
  assert.equal(typeof veille.python.present, "boolean");
  if (veille.python.present) assert.match(veille.python.version, /^Python 3/);
});

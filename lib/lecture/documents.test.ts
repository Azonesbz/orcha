/**
 * Les agents et les commandes dans des sous-dossiers.
 *
 * Claude Code les charge — `giva-flow` appelle `investigator`, qui vit dans
 * `agents/giva-flow/investigator.md`, et ça tourne. Une lecture qui s'arrête au
 * premier niveau ne les voyait pas : absents de l'inventaire, jamais résolus
 * dans un plan de workflow, alors qu'ils sont là et qu'ils servent.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lireAgents, lireCommandes } from "./documents.ts";

function racineJetable(): string {
  return mkdtempSync(join(tmpdir(), "documents-"));
}

function poser(chemin: string, entete: string): void {
  mkdirSync(join(chemin, ".."), { recursive: true });
  writeFileSync(chemin, `---\n${entete}\n---\n\nCorps.\n`, "utf8");
}

test("un agent dans un sous-dossier est lu, sous son nom", () => {
  // Arrange
  const racine = racineJetable();
  poser(join(racine, "agents", "giva-flow", "investigator.md"), "name: investigator\ndescription: Enquête.");
  poser(join(racine, "agents", "designer.md"), "name: designer\ndescription: Dessine.");

  // Act
  const noms = lireAgents(racine, "projet", "x").map((a) => a.nom).sort();

  // Assert
  assert.deepEqual(noms, ["designer", "investigator"]);
});

test("une commande dans un sous-dossier porte son espace de noms", () => {
  // Arrange — Claude Code l'invoque en /giva:cadrer, pas en /cadrer
  const racine = racineJetable();
  poser(join(racine, "commands", "giva", "cadrer.md"), "description: Cadre un ticket.");
  poser(join(racine, "commands", "relire.md"), "description: Relit.");

  // Act
  const noms = lireCommandes(racine, "projet", "x").map((c) => c.nom).sort();

  // Assert
  assert.deepEqual(noms, ["giva:cadrer", "relire"]);
});

test("le chemin d'un agent en sous-dossier est le vrai chemin du fichier", () => {
  // Arrange
  const racine = racineJetable();
  poser(join(racine, "agents", "back", "back-developer.md"), "name: back-developer\ndescription: Code.");

  // Act
  const [agent] = lireAgents(racine, "projet", "x");

  // Assert
  assert.equal(agent.chemin, join(racine, "agents", "back", "back-developer.md"));
});

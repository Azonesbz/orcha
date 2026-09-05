/**
 * Créer un agent, et le brancher sans abîmer la prose de l'étape.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { brancherAgent, creerAgent, debrancherAgent } from "./agent.ts";

function racineJetable(): string {
  const racine = mkdtempSync(join(tmpdir(), "agent-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  process.env.ATELIER_PROJET = racine;
  return racine;
}

const ETAPE = [
  "# Étape 05 — Exécution",
  "",
  "**Sortie attendue** : du code qui passe.",
  "",
  "Une prose soignée que personne ne doit couper en deux.",
  "",
].join("\n");

test("un agent créé porte son nom et sa description en frontmatter", () => {
  // Arrange
  racineJetable();

  // Act
  const chemin = creerAgent("utilisateur", {
    nom: "relecteur", description: "Relit un diff et signale ce qui cloche.", outils: "", modele: "",
  });

  // Assert
  const contenu = readFileSync(chemin, "utf8");
  assert.ok(chemin.endsWith("/agents/relecteur.md"));
  assert.ok(contenu.startsWith("---\nname: relecteur\n"));
  assert.ok(contenu.includes("description: Relit un diff et signale ce qui cloche."));
});

test("un agent sans description est refusé", () => {
  // Arrange
  racineJetable();

  // Act & Assert
  assert.throws(
    () => creerAgent("utilisateur", { nom: "muet", description: "  ", outils: "", modele: "" }),
    /description/i,
  );
});

test("un nom invalide est refusé avant toute écriture", () => {
  // Arrange
  racineJetable();

  // Act & Assert
  assert.throws(
    () => creerAgent("utilisateur", { nom: "Mon Agent", description: "x", outils: "", modele: "" }),
    /nom valide/i,
  );
});

test("créer deux fois le même agent est refusé, sans écraser", () => {
  // Arrange
  racineJetable();
  const premier = creerAgent("utilisateur", { nom: "double", description: "Le vrai.", outils: "", modele: "" });

  // Act & Assert
  assert.throws(
    () => creerAgent("utilisateur", { nom: "double", description: "L'imposteur.", outils: "", modele: "" }),
    /existe déjà/i,
  );
  assert.ok(readFileSync(premier, "utf8").includes("Le vrai."));
});

test("brancher crée la section Sous-agents sans toucher à la prose", () => {
  // Arrange
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  writeFileSync(etape, ETAPE, "utf8");

  // Act
  const resultat = brancherAgent(etape, "test-runner");

  // Assert
  const contenu = readFileSync(etape, "utf8");
  assert.equal(resultat, "ajoute");
  assert.ok(contenu.startsWith(ETAPE.trimEnd()), "la prose d'origine ressort en tête, intacte");
  assert.ok(contenu.includes("## Sous-agents\n\n- `test-runner`"));
});

test("un second agent s'ajoute à la section existante", () => {
  // Arrange
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  writeFileSync(etape, ETAPE, "utf8");
  brancherAgent(etape, "test-runner");

  // Act
  brancherAgent(etape, "verifier");

  // Assert
  const contenu = readFileSync(etape, "utf8");
  assert.equal(contenu.match(/## Sous-agents/g)?.length, 1, "une seule section");
  assert.ok(contenu.includes("- `test-runner`\n- `verifier`"));
});

test("un agent déjà nommé dans la prose n'est pas ajouté une seconde fois", () => {
  // Arrange — le cas de halo, qui écrit « délègue à `test-builder` » en toutes lettres
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  writeFileSync(etape, "Tests d'abord *(délègue à `test-builder`)*.\n", "utf8");

  // Act
  const resultat = brancherAgent(etape, "test-builder");

  // Assert
  assert.equal(resultat, "deja-present");
  assert.equal(readFileSync(etape, "utf8"), "Tests d'abord *(délègue à `test-builder`)*.\n");
});

test("débrancher retire la puce et la section devenue vide", () => {
  // Arrange
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  writeFileSync(etape, ETAPE, "utf8");
  brancherAgent(etape, "test-runner");

  // Act
  const resultat = debrancherAgent(etape, "test-runner");

  // Assert
  const contenu = readFileSync(etape, "utf8");
  assert.equal(resultat, "retire");
  assert.ok(!contenu.includes("test-runner"));
  assert.ok(!contenu.includes("## Sous-agents"), "une section vide ne reste pas");
  assert.ok(contenu.includes("Une prose soignée que personne ne doit couper en deux."));
});

test("débrancher garde la section quand il reste un agent", () => {
  // Arrange
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  writeFileSync(etape, ETAPE, "utf8");
  brancherAgent(etape, "test-runner");
  brancherAgent(etape, "verifier");

  // Act
  debrancherAgent(etape, "test-runner");

  // Assert
  const contenu = readFileSync(etape, "utf8");
  assert.ok(contenu.includes("## Sous-agents"));
  assert.ok(contenu.includes("- `verifier`"));
  assert.ok(!contenu.includes("test-runner"));
});

test("un agent nommé dans la prose n'est pas débranché en douce", () => {
  // Arrange — le cas de halo : « délègue à `test-builder` » au milieu d'une phrase
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  const original = "Tests d'abord *(délègue à `test-builder`)*.\n";
  writeFileSync(etape, original, "utf8");

  // Act
  const resultat = debrancherAgent(etape, "test-builder");

  // Assert
  assert.equal(resultat, "dans-la-prose");
  assert.equal(readFileSync(etape, "utf8"), original, "la phrase reste intacte");
});

test("débrancher un agent qui n'est pas là ne fait rien", () => {
  // Arrange
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  writeFileSync(etape, ETAPE, "utf8");

  // Act
  const resultat = debrancherAgent(etape, "inconnu");

  // Assert
  assert.equal(resultat, "absent");
  assert.equal(readFileSync(etape, "utf8"), ETAPE);
});

test("débrancher n'emporte jamais la prose écrite sous la section", () => {
  // Arrange — régression du 15 août 2026 : la section est la DERNIÈRE et porte
  // du texte sous sa puce. Une version antérieure effaçait tout jusqu'au bout.
  const racine = racineJetable();
  const etape = join(racine, "skills", "x", "steps", "step-05.md");
  mkdirSync(join(racine, "skills", "x", "steps"), { recursive: true });
  writeFileSync(
    etape,
    [
      "# Étape 05", "", "Du travail.", "",
      "## Sous-agents", "", "- `relecteur`", "",
      "Ces agents tournent en parallèle, sauf le dernier.",
      "Ne jamais les lancer sur une branche sale.", "",
    ].join("\n"),
    "utf8",
  );

  // Act
  debrancherAgent(etape, "relecteur");

  // Assert
  const contenu = readFileSync(etape, "utf8");
  assert.ok(contenu.includes("branche sale"), "la prose de fin doit survivre");
  assert.ok(contenu.includes("en parallèle"), "toute la prose, pas seulement la dernière ligne");
  assert.ok(contenu.includes("## Sous-agents"), "la section n'est pas vide : elle reste");
  assert.ok(!contenu.includes("- `relecteur`"), "seule la puce part");
});

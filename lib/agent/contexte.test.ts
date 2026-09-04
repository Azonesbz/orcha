/**
 * Ce que l'agent sait de l'écran d'où on l'appelle.
 *
 * Le contexte est déduit de la route et non passé en props : la coquille ne
 * peut pas recevoir le contexte des pages, et le déduire côté serveur évite de
 * le faire voyager en double. Ce qui se teste ici, c'est ce mappage — et
 * surtout le périmètre, puisque c'est lui qui borne l'écriture.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { contexteDe } from "./contexte.ts";

/** Un ~/.claude jetable avec une compétence à soi et une de plugin. */
function atelierJetable(): { racine: string; mienne: string; duPlugin: string } {
  const racine = mkdtempSync(join(tmpdir(), "ctx-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  delete process.env.ATELIER_PROJET;

  const mienne = join(racine, "skills", "grilling", "SKILL.md");
  mkdirSync(join(racine, "skills", "grilling"), { recursive: true });
  writeFileSync(mienne, "---\nname: grilling\ndescription: Griller.\n---\n\n## Étapes\n\n1. Un.\n", "utf8");

  const duPlugin = join(racine, "plugins", "cache", "giva", "skills", "flux", "SKILL.md");
  mkdirSync(join(racine, "plugins", "cache", "giva", "skills", "flux"), { recursive: true });
  writeFileSync(duPlugin, "---\nname: flux\ndescription: Flux.\n---\n\nCorps.\n", "utf8");

  return { racine, mienne, duPlugin };
}

test("la racine donne le tableau de bord, à l'échelle de tout l'atelier", () => {
  // Arrange
  const { racine } = atelierJetable();

  // Act
  const c = contexteDe("/");

  // Assert
  assert.match(c.titre, /vue d'ensemble/i);
  assert.equal(c.dossier, racine);
  assert.ok(c.suggestions.length > 0);
});

test("l'écran des workflows propose d'en créer un", () => {
  // Arrange
  atelierJetable();

  // Act
  const c = contexteDe("/workflows");

  // Assert
  assert.ok(
    c.suggestions.some((s) => /cr[ée]e/i.test(s)),
    `aucune suggestion de création : ${c.suggestions.join(" / ")}`,
  );
});

test("le plan d'un workflow propose de l'auditer, et se borne à son dossier", () => {
  // Arrange
  const { mienne } = atelierJetable();

  // Act
  const c = contexteDe(`/workflow/${encodeURIComponent(mienne)}`);

  // Assert
  assert.ok(
    c.suggestions.some((s) => /audit/i.test(s)),
    `aucune suggestion d'audit : ${c.suggestions.join(" / ")}`,
  );
  assert.equal(c.dossier, join(process.env.CLAUDE_CONFIG_DIR!, "skills", "grilling"));
  assert.equal(c.peutEcrire, true);
});

test("un fichier de plugin se lit mais ne s'écrit pas", () => {
  // Arrange — un plugin est un clone réécrit à la prochaine mise à jour :
  // y écrire serait perdu en silence, et c'est l'écart que l'outil détecte.
  const { duPlugin } = atelierJetable();

  // Act
  const c = contexteDe(`/competence/${encodeURIComponent(duPlugin)}`);

  // Assert
  assert.equal(c.peutEcrire, false);
});

test("l'éditeur d'un fichier donne son contenu à l'agent", () => {
  // Arrange
  const { mienne } = atelierJetable();

  // Act
  const c = contexteDe(`/competence/${encodeURIComponent(mienne)}`);

  // Assert
  assert.match(c.resume, /grilling/);
  assert.match(c.resume, /## Étapes/);
});

test("une route inconnue retombe sur un contexte général plutôt que de lever", () => {
  // Arrange
  const { racine } = atelierJetable();

  // Act
  const c = contexteDe("/route/qui/n/existe/pas");

  // Assert
  assert.equal(c.dossier, racine);
  assert.ok(c.titre.length > 0);
});

test("un chemin de fichier absent ne fait pas tomber l'écran", () => {
  // Arrange
  atelierJetable();

  // Act
  const c = contexteDe(`/etape/${encodeURIComponent("/nulle/part/etape.md")}`);

  // Assert
  assert.equal(c.peutEcrire, false);
  assert.ok(c.titre.length > 0);
});

test("le tableau de bord ne donne aucun droit d'écriture : on n'y édite rien", () => {
  // Arrange — c'est un écran de lecture. Y autoriser l'écriture donnerait au
  // passage un périmètre grand comme tout ~/.claude.
  atelierJetable();

  // Act
  const c = contexteDe("/");

  // Assert
  assert.equal(c.peutEcrire, false);
});

test("un écran de section borne l'écriture à son propre dossier", () => {
  // Arrange — et surtout pas à ~/.claude entier : l'instantané pris avant
  // écriture y copierait `projects/`, soit des centaines de méga-octets de
  // transcriptions qu'Orcha ne touche jamais. Mesuré : 925 Mo en 17 questions.
  const { racine } = atelierJetable();

  // Act
  const competences = contexteDe("/competences");
  const agents = contexteDe("/agents");

  // Assert
  assert.equal(competences.dossier, join(racine, "skills"));
  assert.equal(agents.dossier, join(racine, "agents"));
});

test("les réglages et la veille se lisent, ne s'écrivent pas depuis l'agent", () => {
  // Arrange
  atelierJetable();

  // Act
  const cas = ["/reglages", "/veille"].map((r) => contexteDe(r));

  // Assert
  assert.deepEqual(
    cas.map((c) => c.peutEcrire),
    [false, false],
  );
});

/**
 * Un projet complet : sa compétence en étapes, et une transcription qui en a
 * franchi une. C'est le seul montage qui prouve que le plan et le déroulé
 * arrivent ensemble à l'agent.
 */
function projetAvecUneSeance(): string {
  const racine = mkdtempSync(join(tmpdir(), "ctx-projet-"));
  process.env.CLAUDE_CONFIG_DIR = join(racine, "config");

  const projet = join(racine, "depot");
  const etapes = join(projet, ".claude", "skills", "flow", "steps");
  mkdirSync(etapes, { recursive: true });
  writeFileSync(
    join(projet, ".claude", "skills", "flow", "SKILL.md"),
    "---\nname: flow\ndescription: Flux.\n---\n\n| # | Étape | Rôle |\n|---|---|---|\n" +
      "| 00 | `steps/step-00.md` | Init |\n| 01 | `steps/step-01.md` | Suite |\n",
    "utf8",
  );
  writeFileSync(join(etapes, "step-00.md"), "Init.\n", "utf8");
  writeFileSync(join(etapes, "step-01.md"), "Suite.\n", "utf8");
  process.env.ATELIER_PROJET = projet;

  const trace = join(racine, "config", "projects", "-depot");
  mkdirSync(trace, { recursive: true });
  const T = (minute: number) => `2026-08-18T14:${String(minute).padStart(2, "0")}:00.000Z`;
  writeFileSync(
    join(trace, "S1.jsonl"),
    [
      { type: "user", sessionId: "S1", timestamp: T(0), cwd: projet, message: { content: "vas-y" } },
      {
        type: "assistant",
        sessionId: "S1",
        timestamp: T(5),
        message: { content: [{ type: "tool_use", name: "Bash", input: { command: "cat steps/step-00.md" } }] },
      },
      { type: "user", sessionId: "S1", timestamp: T(20), cwd: projet, message: { content: "ok" } },
    ]
      .map((l) => JSON.stringify(l))
      .join("\n"),
    "utf8",
  );
  return join(projet, ".claude", "skills", "flow", "SKILL.md");
}

test("le plan d'un workflow part avec son déroulé mesuré, pas seulement déclaré", () => {
  // Arrange
  const skill = projetAvecUneSeance();

  // Act
  const c = contexteDe(`/workflow/${encodeURIComponent(skill)}`);

  // Assert
  assert.match(c.resume, /Séquence :/, "le plan déclaré reste là");
  assert.match(c.resume, /Déroulé mesuré sur 1 séance/);
  assert.match(c.resume, /00 — franchie dans 1\/1 séances/);
  assert.match(c.resume, /01 — non observée/);
  assert.match(
    c.resume,
    /ne prouve donc PAS « non faite »/,
    "sans la mise en garde, l'agent conclura « étape morte, supprime-la »",
  );
  delete process.env.ATELIER_PROJET;
});

/** Un projet jetable sous Git, sur `main`, avec son `.claude` commité. */
function projetJetable(): string {
  const racine = mkdtempSync(join(tmpdir(), "projet-"));
  mkdirSync(join(racine, ".claude", "skills", "x"), { recursive: true });
  writeFileSync(join(racine, ".claude", "skills", "x", "SKILL.md"), "---\nname: x\ndescription: X.\n---\n\nCorps.\n", "utf8");
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", racine, "-c", "user.name=Orcha", "-c", "user.email=orcha@test", ...args], { stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("add", ".");
  git("commit", "-q", "-m", "init");
  return racine;
}

test("dans un dépôt, l'agent apprend la branche sur laquelle il est", () => {
  // Arrange
  atelierJetable();
  process.env.ATELIER_PROJET = projetJetable();

  // Act
  const c = contexteDe("/");

  // Assert
  assert.equal(c.depot?.branche, "main");
  assert.equal(c.depot?.propre, true);
  assert.match(c.resume, /branche main/, "le résumé lu par l'agent nomme la branche");
});

test("hors dépôt, le contexte ne parle d'aucune branche", () => {
  // Arrange — un projet imposé sans `.claude`, sinon la remontée d'arborescence
  // depuis le dossier de lancement trouve le dépôt d'Orcha lui-même.
  atelierJetable();
  process.env.ATELIER_PROJET = mkdtempSync(join(tmpdir(), "sans-projet-"));

  // Act
  const c = contexteDe("/");

  // Assert
  assert.equal(c.depot, undefined);
  assert.doesNotMatch(c.resume, /branche/);
});

test("l'écran d'une commande donne son fichier à l'agent, en écriture", () => {
  // Arrange — la route /commande/<chemin> est née après le mappage des routes :
  // sans son entrée, l'agent y regardait la vue d'ensemble, en lecture seule.
  const { racine } = atelierJetable();
  const commande = join(racine, "commands", "relire.md");
  mkdirSync(join(racine, "commands"), { recursive: true });
  writeFileSync(commande, "---\ndescription: Relire.\n---\n\nRelis.\n", "utf8");

  // Act
  const c = contexteDe(`/commande/${encodeURIComponent(commande)}`);

  // Assert
  assert.match(c.titre, /relire/);
  assert.equal(c.peutEcrire, true);
  assert.equal(c.dossier, join(racine, "commands"));
});

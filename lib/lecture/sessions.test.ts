/**
 * Le repérage des séances, sur un faux dossier utilisateur.
 *
 * Ce qui compte : le nom du dossier de traces ne se décode pas — c'est le `cwd`
 * écrit dans la transcription qui désigne le projet, et rien d'autre.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { compterSessions, listerSessions } from "./sessions.ts";

const PROJET = "/w/giva-front/Ai-Giva";

/** Un `~/.claude` jetable, avec ses dossiers de traces et leurs transcriptions. */
function racineJetable(traces: Record<string, Record<string, string>>): void {
  const racine = mkdtempSync(join(tmpdir(), "sessions-"));
  process.env.CLAUDE_CONFIG_DIR = racine;

  let age = 0;
  for (const [nom, fichiers] of Object.entries(traces)) {
    const dossier = join(racine, "projects", nom);
    mkdirSync(dossier, { recursive: true });
    for (const [session, cwd] of Object.entries(fichiers)) {
      const chemin = join(dossier, `${session}.jsonl`);
      writeFileSync(chemin, JSON.stringify({ type: "user", timestamp: "2026-08-18T14:00:00.000Z", cwd }), "utf8");
      // Les plus récentes d'abord : on maîtrise l'ordre plutôt que de le subir.
      utimesSync(chemin, 1_000_000 - age, 1_000_000 - age);
      age += 100;
    }
  }
}

test("seules les traces dont le `cwd` désigne le projet sont ouvertes", () => {
  // Arrange — le nom du dossier est ambigu, le `cwd` ne l'est pas.
  racineJetable({
    "-w-giva-front-Ai-Giva": { S1: PROJET },
    "-w-autre-projet": { S2: "/w/autre/projet" },
  });

  // Act
  const sessions = listerSessions(PROJET);

  // Assert
  assert.deepEqual(sessions.map((s) => s.id), ["S1"]);
});

test("les plus récentes d'abord, et pas plus que demandé", () => {
  // Arrange
  racineJetable({ "-w-giva-front-Ai-Giva": { S1: PROJET, S2: PROJET, S3: PROJET } });

  // Act
  const sessions = listerSessions(PROJET, 2);

  // Assert
  assert.deepEqual(sessions.map((s) => s.id), ["S1", "S2"]);
  assert.equal(compterSessions(PROJET), 3, "le total dit ce qu'on n'a pas ouvert");
});

test("un projet sans aucune trace ne rend rien plutôt que de lever", () => {
  // Arrange
  racineJetable({ "-w-autre-projet": { S2: "/w/autre/projet" } });

  // Act
  const sessions = listerSessions(PROJET);

  // Assert
  assert.deepEqual(sessions, []);
  assert.equal(compterSessions(PROJET), 0);
});

/**
 * La lecture d'une transcription, sur des fichiers jetables.
 *
 * Les cas tordus qu'on teste sont ceux qu'on a vus sur le disque, pas des cas
 * d'école : la transcription d'un sous-agent recopiée dans le même fichier, un
 * `cat >` qui écrit une étape au lieu de la lire, une ligne tronquée, et le
 * vieux nom `Task` de l'outil de sous-agent.
 */

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { lireSession } from "./deroule.ts";

/** Écrit une transcription jetable et rend son chemin. */
function transcription(lignes: unknown[], nom = "S1"): string {
  const racine = mkdtempSync(join(tmpdir(), "deroule-"));
  const chemin = join(racine, `${nom}.jsonl`);
  writeFileSync(chemin, lignes.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n"), "utf8");
  return chemin;
}

const T = (minute: number, seconde = 0) =>
  `2026-08-18T14:${String(minute).padStart(2, "0")}:${String(seconde).padStart(2, "0")}.000Z`;

const humain = (minute: number, texte: string) => ({
  type: "user",
  timestamp: T(minute),
  message: { role: "user", content: texte },
});

const outil = (minute: number, name: string, input: unknown) => ({
  type: "assistant",
  timestamp: T(minute),
  message: { role: "assistant", content: [{ type: "tool_use", name, input }] },
});

test("une transcription donne son titre, ses bornes, ses étapes et ses agents", () => {
  // Arrange
  const chemin = transcription([
    { type: "custom-title", customTitle: "GIVA-flow PR-1607", sessionId: "S1" },
    humain(0, "/giva-flow PR-1607"),
    outil(1, "Bash", { command: "cat .claude/skills/giva-flow/steps/step-00-init.md" }),
    outil(2, "Agent", { subagent_type: "implementer", run_in_background: true }),
    outil(9, "Read", { file_path: "/w/.claude/skills/giva-flow/steps/step-01-arbitrate.md" }),
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.ok(session);
  assert.equal(session.id, "S1");
  assert.equal(session.titre, "GIVA-flow PR-1607");
  assert.equal(session.debut, Date.parse(T(0)));
  assert.equal(session.fin, Date.parse(T(9)));
  assert.deepEqual(session.fichiersLus.map((f) => f.fichier), ["step-00-init.md", "step-01-arbitrate.md"]);
  assert.deepEqual(session.agents, [{ agent: "implementer", a: Date.parse(T(2)), enFond: true }]);
});

test("le dernier titre gagne, et un titre d'une autre session est ignoré", () => {
  // Arrange — les transcriptions reprises recopient les titres de leur parent.
  const chemin = transcription([
    { type: "custom-title", customTitle: "Titre d'ailleurs", sessionId: "AUTRE" },
    { type: "custom-title", customTitle: "PR-1574 giva-flow base", sessionId: "S1" },
    { type: "custom-title", customTitle: "Mandat", sessionId: "S1" },
    humain(0, "salut"),
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.equal(session?.titre, "Mandat");
});

test("le vieux nom Task est lu comme un appel d'agent", () => {
  // Arrange
  const chemin = transcription([humain(0, "vas-y"), outil(1, "Task", { subagent_type: "reviewer" })]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.agents.map((a) => a.agent), ["reviewer"]);
  assert.equal(session?.agents[0].enFond, false, "absent vaut premier plan, pas indéfini");
});

test("l'attente humaine se mesure du dernier geste de la machine à la réponse", () => {
  // Arrange
  const chemin = transcription([
    humain(0, "/giva-flow PR-1607"),
    outil(1, "Bash", { command: "echo coucou" }),
    humain(20, "ok, valide"),
    outil(21, "Bash", { command: "echo suite" }),
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert — le tout premier tour ouvre la séance, il n'attend rien.
  assert.deepEqual(session?.attentes, [{ de: Date.parse(T(1)), a: Date.parse(T(20)) }]);
});

test("un trou trop long n'est pas une attente : c'est une séance abandonnée", () => {
  // Arrange — une session laissée ouverte la nuit compterait douze heures
  // d'« attente sur arrêt dur » et noierait les vraies.
  const chemin = transcription([humain(0, "vas-y"), outil(1, "Bash", { command: "ls" }), humain(59, "je reviens")]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.attentes, []);
  assert.equal(session?.pauses.length, 1);
});

test("un trou entre deux gestes de la machine est une pause aussi", () => {
  // Arrange — une nuit passe alors qu'une tâche de fond tourne : personne ne
  // reprend la parole, et sans cette garde les huit heures comptaient en
  // « travail machine ».
  const chemin = transcription([
    humain(0, "vas-y"),
    outil(1, "Bash", { command: "ls" }),
    outil(59, "Bash", { command: "echo le lendemain" }),
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.pauses, [{ de: Date.parse(T(1)), a: Date.parse(T(59)) }]);
  assert.deepEqual(session?.attentes, []);
});

test("ce que fait un sous-agent n'est ni un tour humain ni une étape franchie", () => {
  // Arrange — les transcriptions de sous-agents vivent dans le même fichier.
  const chemin = transcription([
    humain(0, "vas-y"),
    { ...outil(1, "Bash", { command: "cat steps/step-04-tdd-red.md" }), isSidechain: true },
    { ...humain(2, "prompt du sous-agent"), isSidechain: true },
    outil(3, "Bash", { command: "echo fin" }),
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.fichiersLus, []);
  assert.deepEqual(session?.attentes, []);
});

test("écrire une étape n'est pas la franchir", () => {
  // Arrange — une session qui répare le workflow le cite sans l'exécuter.
  const chemin = transcription([
    humain(0, "corrige l'étape 1"),
    outil(1, "Bash", { command: "cat > steps/step-01-arbitrate.md <<'EOF'\ntexte\nEOF" }),
    outil(2, "Edit", { file_path: "steps/step-02-ticket.md", old_string: "a", new_string: "b" }),
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.fichiersLus, []);
});

test("les injections du système ne sont pas des tours humains", () => {
  // Arrange
  const chemin = transcription([
    humain(0, "vas-y"),
    outil(1, "Bash", { command: "ls" }),
    { ...humain(5, "<task-notification>…</task-notification>") },
    { ...humain(6, "Base directory for this skill: /w"), isMeta: true },
    { type: "user", timestamp: T(7), message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } },
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.attentes, []);
});

test("une pièce jointe rejouée ne remonte pas l'horloge", () => {
  // Arrange — les lignes `attachment` et `system` portent l'horodatage de leur
  // capture, pas celui du tour où elles sont rejouées. Les laisser mener la
  // pendule fabriquait des reculs de seize heures, donc de fausses pauses.
  const chemin = transcription([
    humain(0, "vas-y"),
    outil(20, "Bash", { command: "ls" }),
    { type: "attachment", timestamp: T(1), content: "…" },
    humain(25, "et ensuite ?"),
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.attentes, [{ de: Date.parse(T(20)), a: Date.parse(T(25)) }]);
  assert.equal(session?.fin, Date.parse(T(25)));
});

test("les tours d'une autre session recopiés ici ne comptent pas", () => {
  // Arrange — une session reprise emporte l'historique de son parent.
  const chemin = transcription([
    { ...humain(0, "vas-y"), sessionId: "S1" },
    { ...outil(1, "Bash", { command: "cat steps/step-00-init.md" }), sessionId: "PARENT" },
    { ...outil(2, "Bash", { command: "cat steps/step-01-arbitrate.md" }), sessionId: "S1" },
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.deepEqual(session?.fichiersLus.map((f) => f.fichier), ["step-01-arbitrate.md"]);
});

test("une ligne tronquée est comptée, pas fatale", () => {
  // Arrange
  const chemin = transcription([humain(0, "vas-y"), '{"type":"assistant","timesta', outil(2, "Bash", { command: "ls" })]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.equal(session?.lignesIllisibles, 1);
  assert.equal(session?.fin, Date.parse(T(2)), "la lecture continue après la ligne cassée");
});

test("un fichier sans aucun tour reconnaissable se déclare non reconnu", () => {
  // Arrange — plutôt que de rendre une session vide qu'on prendrait pour un
  // workflow jamais emprunté.
  const chemin = transcription([
    { type: "bridge-session", sessionId: "S1" },
    { type: "queue-operation", operation: "enqueue", timestamp: T(0) },
  ]);

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.equal(session?.reconnue, false);
});

test("un fichier absent ne lève pas", () => {
  // Arrange
  const chemin = join(tmpdir(), "deroule-inexistant", "S1.jsonl");

  // Act
  const session = lireSession(chemin);

  // Assert
  assert.equal(session, null);
});

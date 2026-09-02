/**
 * Le flux du CLI, ligne à ligne.
 *
 * C'est le module qui décide ce que l'utilisateur voit pendant que l'agent
 * travaille : on le teste sur de vraies lignes de `--output-format stream-json`,
 * capturées d'un `claude -p`, pas sur des formes inventées. Le format n'est pas
 * documenté ni stable — un test bâti sur une supposition ne prouverait rien.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { lireGestes } from "./flux.ts";

/** Une ligne d'assistant, telle que le CLI la rend, avec ses blocs. */
function assistant(...blocs: unknown[]): string {
  return JSON.stringify({ type: "assistant", message: { content: blocs } });
}

test("le récit de l'agent devient une note", () => {
  // Arrange
  const ligne = assistant({ type: "text", text: "Je vais lire note.txt." });

  // Act
  const gestes = lireGestes(ligne);

  // Assert
  assert.deepEqual(gestes, [{ sorte: "note", quoi: "Je vais lire note.txt." }]);
});

test("une lecture nomme son fichier", () => {
  // Arrange
  const ligne = assistant({
    type: "tool_use",
    name: "Read",
    input: { file_path: "/Users/x/.claude/skills/lancer/SKILL.md" },
  });

  // Act
  const gestes = lireGestes(ligne);

  // Assert
  assert.deepEqual(gestes, [
    { sorte: "lecture", quoi: "/Users/x/.claude/skills/lancer/SKILL.md" },
  ]);
});

test("une écriture emporte ce qu'elle remplace", () => {
  // Arrange — c'est le seul geste dont on montre le contenu : sans l'avant et
  // l'après, « Modifié SKILL.md » ne dit rien de ce qui a changé.
  const ligne = assistant({
    type: "tool_use",
    name: "Edit",
    input: { file_path: "/x/SKILL.md", old_string: "00. Cadrage", new_string: "00. Cadrer" },
  });

  // Act
  const [geste] = lireGestes(ligne);

  // Assert
  assert.equal(geste.sorte, "ecriture");
  assert.equal(geste.avant, "00. Cadrage");
  assert.equal(geste.apres, "00. Cadrer");
});

test("un fichier créé de zéro n'a pas d'avant", () => {
  // Arrange
  const ligne = assistant({
    type: "tool_use",
    name: "Write",
    input: { file_path: "/x/etape-05.md", content: "# Livrer" },
  });

  // Act
  const [geste] = lireGestes(ligne);

  // Assert
  assert.equal(geste.sorte, "ecriture");
  assert.equal(geste.avant, "");
  assert.equal(geste.apres, "# Livrer");
});

test("le résultat de l'outil n'atteint jamais l'écran", () => {
  // Arrange — une transcription contient des prompts entiers, donc
  // potentiellement des secrets. Orcha montre les gestes, jamais leur retour.
  const ligne = JSON.stringify({
    type: "user",
    message: { content: [{ type: "tool_result", content: "1\tclé secrète" }] },
  });

  // Act
  const gestes = lireGestes(ligne);

  // Assert
  assert.deepEqual(gestes, []);
});

test("le raisonnement interne ne remonte pas non plus", () => {
  // Arrange — il noierait la réponse dans un panneau de trente rem.
  const ligne = assistant({ type: "thinking", thinking: "Bon, alors…" });

  // Act & Assert
  assert.deepEqual(lireGestes(ligne), []);
});

test("les hooks et l'initialisation sont du bruit", () => {
  // Arrange
  const bruit = [
    JSON.stringify({ type: "system", subtype: "hook_started", hook_name: "SessionStart" }),
    JSON.stringify({ type: "system", subtype: "init", tools: ["Read"] }),
    JSON.stringify({ type: "system", subtype: "thinking_tokens" }),
    "",
  ];

  // Act
  const gestes = bruit.flatMap(lireGestes);

  // Assert
  assert.deepEqual(gestes, []);
});

test("une ligne tronquée ne casse pas le flux", () => {
  // Arrange — un `spawn` coupé en plein vol rend une ligne à moitié écrite ;
  // planter là-dessus perdrait tout ce que l'agent a déjà fait.
  const ligne = '{"type":"assistant","message":{"cont';

  // Act & Assert
  assert.deepEqual(lireGestes(ligne), []);
});

test("la fin porte la réponse, celle qu'on lit", () => {
  // Arrange
  const ligne = JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: "## Ajouté\nModifié SKILL.md : une étape de plus.",
  });

  // Act
  const [geste] = lireGestes(ligne);

  // Assert
  assert.equal(geste.sorte, "fin");
  assert.match(geste.quoi, /^## Ajouté/);
});

test("un échec du CLI se dit comme un échec, pas comme une réponse", () => {
  // Arrange — sans ça, « Failed to authenticate » s'affiche comme si c'était
  // ce que l'agent avait à dire.
  const ligne = JSON.stringify({
    type: "result",
    subtype: "error_during_execution",
    is_error: true,
    result: "Failed to authenticate",
  });

  // Act
  const [geste] = lireGestes(ligne);

  // Assert
  assert.equal(geste.sorte, "echec");
});

test("une commande et une recherche se distinguent d'une lecture", () => {
  // Arrange
  const lignes = [
    assistant({ type: "tool_use", name: "Bash", input: { command: "npm test" } }),
    assistant({ type: "tool_use", name: "Grep", input: { pattern: "arrêt dur" } }),
    assistant({ type: "tool_use", name: "Agent", input: { subagent_type: "verifier" } }),
  ];

  // Act
  const sortes = lignes.flatMap(lireGestes).map((g) => g.sorte);

  // Assert
  assert.deepEqual(sortes, ["commande", "recherche", "delegation"]);
});

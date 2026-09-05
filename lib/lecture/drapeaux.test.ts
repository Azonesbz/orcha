/**
 * Les drapeaux d'un workflow : ce qu'un `--express` ou un `--cadrage` change à
 * la séquence. Le gabarit est le tableau des modes de `giva-flow`, tel qu'il
 * est écrit — une ligne par mode, une cellule qui dit les étapes.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { combiner, lireDrapeaux } from "./drapeaux.ts";

const NUMEROS = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];

const MODES = [
  "### Les modes — un flag, une matrice d'étapes",
  "",
  "| Mode | Flag | Étapes | Ce qui change |",
  "|------|------|--------|---------------|",
  "| **complet** | *(aucun — défaut)* | 0 → 8 | Toute l'armature. |",
  "| **express** | `--express` | 0 → 8, étapes 4 et 6 **sautées** | Petit fix évident : pas de testeur ni de revue qualité. |",
  "| **cadrage** | `--cadrage` | 0 → 2 puis **STOP** | Produire un ticket Notion propre sans l'implémenter. |",
  "| **tests** | `--tests-only` | 0 → 8, étape 5 sautée | Sujet de tests uniquement. |",
  "| **refacto** | `--refacto-only` | 0 → 8 | Refacto isocomportemental. |",
  "| **review** | `--review-only` | 0, 1, 6 puis **STOP** | **Audit d'une PR existante, en lecture seule.** |",
  "",
  "### Les paramètres orthogonaux — combinables avec n'importe quel mode",
  "",
  "| Flag | Effet |",
  "|------|-------|",
  "| `--front` / `--back` | Force la filière. Le conflit est signalé et la propriété est corrigée à l'étape 2. |",
  "| `--full-auto` | Aucune pause de confort. **Ne saute jamais les arrêts durs.** |",
  "",
  "## Points d'escalade",
  "",
  "| Situation | Action |",
  "|-----------|--------|",
  "| `--review-only` : PR introuvable | Demander laquelle. STOP. |",
  "",
].join("\n");

function drapeau(nom: string) {
  const trouve = lireDrapeaux(MODES, NUMEROS).find((d) => d.drapeau === nom);
  assert.ok(trouve, `${nom} absent`);
  return trouve;
}

test("un mode qui saute des étapes les retire des actives", () => {
  // Arrange & Act
  const express = drapeau("--express");

  // Assert
  assert.equal(express.mode, "express");
  assert.deepEqual(express.actives, ["0", "1", "2", "3", "5", "7", "8"]);
  assert.equal(express.finAnticipee, null);
  assert.match(express.effet, /pas de testeur/);
});

test("un mode qui s'arrête tôt garde une plage courte et dit où il finit", () => {
  // Arrange & Act
  const cadrage = drapeau("--cadrage");

  // Assert
  assert.deepEqual(cadrage.actives, ["0", "1", "2"]);
  assert.equal(cadrage.finAnticipee, "2");
});

test("une liste explicite d'étapes se lit telle quelle", () => {
  // Arrange & Act
  const review = drapeau("--review-only");

  // Assert
  assert.deepEqual(review.actives, ["0", "1", "6"]);
  assert.equal(review.finAnticipee, "6");
});

test("une étape sautée au singulier compte aussi", () => {
  // Arrange & Act
  const tests = drapeau("--tests-only");

  // Assert
  assert.deepEqual(tests.actives, ["0", "1", "2", "3", "4", "6", "7", "8"]);
});

test("un mode sans changement de séquence garde toutes les étapes", () => {
  // Arrange & Act
  const refacto = drapeau("--refacto-only");

  // Assert
  assert.deepEqual(refacto.actives, NUMEROS);
});

test("les paramètres orthogonaux sont listés sans toucher à la séquence", () => {
  // Arrange & Act
  const front = drapeau("--front");
  const auto = drapeau("--full-auto");

  // Assert
  assert.equal(front.actives, null);
  assert.equal(auto.actives, null);
  assert.match(auto.effet, /Aucune pause/);
  assert.ok(!auto.effet.includes("**"), "l'emphase Markdown ne ressort pas");
});

test("un drapeau cité dans un autre tableau ne fait ni doublon ni écrasement", () => {
  // Arrange & Act
  const tous = lireDrapeaux(MODES, NUMEROS).filter((d) => d.drapeau === "--review-only");

  // Assert
  assert.equal(tous.length, 1);
  assert.deepEqual(tous[0].actives, ["0", "1", "6"]);
});

test("les numéros se résolvent sur ceux du tableau, zéro devant compris", () => {
  // Arrange
  const numeros = ["00", "01", "02", "03", "04", "05", "06", "07", "08"];

  // Act
  const express = lireDrapeaux(MODES, numeros).find((d) => d.drapeau === "--express");

  // Assert
  assert.deepEqual(express?.actives, ["00", "01", "02", "03", "05", "07", "08"]);
});

test("sans drapeau nulle part, rien", () => {
  // Arrange & Act & Assert
  assert.deepEqual(lireDrapeaux("## Séquence\n\n| 0 | `steps/a.md` | Rôle |\n", ["0"]), []);
});

test("un chiffre dans une cellule d'effet n'en fait pas une séquence", () => {
  // Arrange — la vraie ligne de giva-flow : « corrigée à l'étape 2 »
  const front = lireDrapeaux(MODES, NUMEROS).find((d) => d.drapeau === "--front");

  // Assert
  assert.equal(front?.actives, null);
  assert.match(front?.effet ?? "", /étape 2/);
});

function choisir(...noms: string[]) {
  return lireDrapeaux(MODES, NUMEROS).filter((d) => noms.includes(d.drapeau));
}

test("plusieurs drapeaux se combinent : une étape survit si tous la gardent", () => {
  // Arrange — express garde tout sauf 4 et 6, cadrage garde 0 → 2
  const effet = combiner(choisir("--express", "--cadrage"), NUMEROS);

  // Assert
  assert.deepEqual([...effet.sautees ?? []], ["3", "4", "5", "6", "7", "8"]);
  assert.equal(effet.fin, "2", "la fin la plus tôt l'emporte");
});

test("un paramètre orthogonal ne change rien à ce qu'un mode saute", () => {
  // Arrange & Act
  const seul = combiner(choisir("--express"), NUMEROS);
  const avec = combiner(choisir("--express", "--front", "--full-auto"), NUMEROS);

  // Assert
  assert.deepEqual([...avec.sautees ?? []], [...seul.sautees ?? []]);
  assert.equal(avec.fin, seul.fin);
});

test("des paramètres orthogonaux seuls ne grisent rien", () => {
  // Arrange & Act
  const effet = combiner(choisir("--front", "--full-auto"), NUMEROS);

  // Assert
  assert.equal(effet.sautees, undefined);
  assert.equal(effet.fin, null);
});

test("aucun drapeau choisi : rien", () => {
  // Arrange & Act & Assert
  assert.deepEqual(combiner([], NUMEROS), { sautees: undefined, fin: null });
});

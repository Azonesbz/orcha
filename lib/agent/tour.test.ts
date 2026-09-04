/**
 * Ce que les gestes versent dans un tour — et surtout le brouillon : la
 * réponse qui s'écrit mot à mot, avant d'être posée.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { versee, type Tour } from "./tour.ts";

const OUVERT: Tour[] = [
  { qui: "moi", texte: "Combien d'agents ?" },
  { qui: "agent", texte: "", gestes: [] },
];

function dernier(tours: Tour[]): Tour {
  return tours.at(-1)!;
}

test("les fragments s'ajoutent bout à bout au brouillon, pas à la piste", () => {
  // Arrange
  let tours = OUVERT;

  // Act
  tours = versee(tours, { sorte: "fragment", quoi: "Quinze" });
  tours = versee(tours, { sorte: "fragment", quoi: " agents" });

  // Assert
  assert.equal(dernier(tours).brouillon, "Quinze agents");
  assert.deepEqual(dernier(tours).gestes, [], "un fragment n'est pas un geste à montrer");
  assert.equal(dernier(tours).texte, "", "la réponse n'est posée qu'à la fin");
});

test("la note qui clôt le bloc laisse le brouillon affiché", () => {
  // Arrange — le CLI rend le bloc complet juste après ses fragments, puis le
  // résultat : entre les deux, la réponse ne doit pas disparaître de l'écran.
  let tours = versee(OUVERT, { sorte: "fragment", quoi: "Quinze agents." });

  // Act
  tours = versee(tours, { sorte: "note", quoi: "Quinze agents." });

  // Assert
  assert.equal(dernier(tours).brouillon, "Quinze agents.");
  assert.deepEqual(dernier(tours).gestes, [{ sorte: "note", quoi: "Quinze agents." }]);
});

test("un geste d'action referme le brouillon : c'était du récit, il est dans la piste", () => {
  // Arrange
  let tours = versee(OUVERT, { sorte: "fragment", quoi: "Je regarde." });
  tours = versee(tours, { sorte: "note", quoi: "Je regarde." });

  // Act
  tours = versee(tours, { sorte: "lecture", quoi: "/x/CLAUDE.md" });

  // Assert
  assert.equal(dernier(tours).brouillon, "");
  assert.equal(dernier(tours).gestes?.length, 2);
});

test("un bloc déjà versé en note ne se prolonge pas : le fragment suivant repart de zéro", () => {
  // Arrange — deux blocs de texte d'affilée, sans action entre eux
  let tours = versee(OUVERT, { sorte: "fragment", quoi: "Un." });
  tours = versee(tours, { sorte: "note", quoi: "Un." });

  // Act
  tours = versee(tours, { sorte: "fragment", quoi: "Deux" });

  // Assert
  assert.equal(dernier(tours).brouillon, "Deux");
});

test("la fin pose la réponse et efface le brouillon", () => {
  // Arrange
  let tours = versee(OUVERT, { sorte: "fragment", quoi: "Quinze agents." });
  tours = versee(tours, { sorte: "note", quoi: "Quinze agents." });

  // Act
  tours = versee(tours, { sorte: "fin", quoi: "Quinze agents." });

  // Assert
  assert.equal(dernier(tours).texte, "Quinze agents.");
  assert.equal(dernier(tours).brouillon, "");
  assert.deepEqual(dernier(tours).gestes, [], "la réponse est retirée de la piste qui l'annonçait");
});

test("un fragment sans tour d'agent ouvert ne fait rien", () => {
  // Arrange
  const tours: Tour[] = [{ qui: "moi", texte: "Salut" }];

  // Act
  const suite = versee(tours, { sorte: "fragment", quoi: "Bonjour" });

  // Assert
  assert.deepEqual(suite, tours);
});

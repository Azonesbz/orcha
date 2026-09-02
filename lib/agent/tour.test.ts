/**
 * Ce que les gestes versent dans le fil.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { versee, type Tour } from "./tour.ts";

const ATTENTE: Tour[] = [
  { qui: "moi", texte: "Ajoute une étape" },
  { qui: "agent", texte: "", gestes: [] },
];

test("un geste s'ajoute à la piste du tour en cours", () => {
  // Arrange
  const tours = ATTENTE;

  // Act
  const apres = versee(tours, { sorte: "lecture", quoi: "/x/SKILL.md" });

  // Assert
  assert.deepEqual(apres.at(-1)?.gestes, [{ sorte: "lecture", quoi: "/x/SKILL.md" }]);
  assert.equal(apres.at(-1)?.texte, "");
});

test("la fin ferme le tour avec la réponse", () => {
  // Arrange
  const tours = ATTENTE;

  // Act
  const apres = versee(tours, { sorte: "fin", quoi: "## Ajouté" });

  // Assert
  assert.equal(apres.at(-1)?.texte, "## Ajouté");
  assert.equal(apres.at(-1)?.echec, false);
});

test("le premier dénouement gagne : le code de sortie n'écrase pas la consigne", () => {
  // Arrange — le CLI dit d'abord ce qui cloche, puis s'arrête ; le lanceur
  // traduit le code de sortie. Sans cette règle, l'écran affichait le numéro.
  const dit = versee(ATTENTE, { sorte: "echec", quoi: "Not logged in · Please run /login" });

  // Act
  const apres = versee(dit, { sorte: "echec", quoi: "Le CLI s'est arrêté avec le code 1." });

  // Assert
  assert.match(apres.at(-1)!.texte, /\/login/);
});

test("un geste arrivé après la réponse ne recrée pas de tour", () => {
  // Arrange
  const fini = versee(ATTENTE, { sorte: "fin", quoi: "## Constat" });

  // Act — le tour de l'utilisateur seul : rien à verser.
  const apres = versee([{ qui: "moi", texte: "Et après ?" }], { sorte: "lecture", quoi: "/x" });

  // Assert
  assert.equal(fini.at(-1)?.texte, "## Constat");
  assert.deepEqual(apres, [{ qui: "moi", texte: "Et après ?" }]);
});

test("la réponse ne s'affiche pas deux fois", () => {
  // Arrange — le dernier bloc de texte de l'agent EST la réponse : le CLI le
  // rend au fil de l'eau, puis à nouveau comme résultat.
  const enCours = versee(ATTENTE, { sorte: "lecture", quoi: "/x/step-01.md" });
  const annonce = versee(enCours, { sorte: "note", quoi: "## Modifié step-01" });

  // Act
  const apres = versee(annonce, { sorte: "fin", quoi: "## Modifié step-01\n\nEnsuite : relire." });

  // Assert
  assert.deepEqual(apres.at(-1)?.gestes, [{ sorte: "lecture", quoi: "/x/step-01.md" }]);
  assert.match(apres.at(-1)!.texte, /Ensuite/);
});

test("le récit du début reste, lui : c'est ce qu'on est venu voir", () => {
  // Arrange
  const dit = versee(ATTENTE, { sorte: "note", quoi: "Je vais ouvrir l'étape 01." });
  const lu = versee(dit, { sorte: "lecture", quoi: "/x/step-01.md" });

  // Act
  const apres = versee(lu, { sorte: "fin", quoi: "## Constat : rien à changer." });

  // Assert
  assert.equal(apres.at(-1)?.gestes?.length, 2);
  assert.equal(apres.at(-1)?.gestes?.[0].quoi, "Je vais ouvrir l'étape 01.");
});

/**
 * La question posée à l'agent depuis une ligne du déroulé.
 *
 * Ce qui compte : elle se suffit à elle-même. L'agent la reçoit comme un
 * message d'utilisateur, et doit pouvoir travailler dessus sans que personne
 * n'ait à recopier les chiffres de l'écran.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { EtapeMesuree } from "../lecture/mesures.ts";
import { questionDOptimisation } from "./question.ts";

const m = (minutes: number) => minutes * 60_000;

function etape(partiel: Partial<EtapeMesuree>): EtapeMesuree {
  return {
    numero: "07",
    role: "Validation / Review par [OWNER]",
    arretDur: false,
    sessions: 6,
    lectures: 6,
    machine: m(11),
    attente: m(25),
    ...partiel,
  };
}

test("la question porte le numéro, le rôle et les chiffres mesurés", () => {
  // Arrange
  const mesuree = etape({});

  // Act
  const question = questionDOptimisation(mesuree, 10);

  // Assert
  assert.match(question, /étape 07/i);
  assert.match(question, /Validation \/ Review par \[OWNER\]/);
  assert.match(question, /6 des 10 séances/);
  assert.match(question, /11 min de travail machine/);
  assert.match(question, /25 min d'attente humaine/);
});

test("l'arrêt dur est nommé : c'est lui qui explique l'attente", () => {
  // Arrange
  const avec = etape({ arretDur: true });
  const sans = etape({ arretDur: false });

  // Act
  const question = questionDOptimisation(avec, 10);

  // Assert
  assert.match(question, /arrêt dur/);
  assert.doesNotMatch(questionDOptimisation(sans, 10), /arrêt dur/);
});

test("une étape relue plus souvent qu'elle n'est franchie annonce sa boucle", () => {
  // Arrange — 19 lectures pour 5 séances : presque quatre passages par séance.
  const boucle = etape({ sessions: 5, lectures: 19 });

  // Act
  const question = questionDOptimisation(boucle, 10);

  // Assert
  assert.match(question, /19 fois/);
});

test("la phrase se tient : pas d'espace avant une virgule quand la boucle manque", () => {
  // Arrange — le fragment « relue N fois » est optionnel, et le `join` laissait
  // sa place vide juste avant la ponctuation.
  const sansBoucle = etape({ sessions: 6, lectures: 6 });

  // Act
  const question = questionDOptimisation(sansBoucle, 10);

  // Assert
  assert.doesNotMatch(question, / ,/, question);
  assert.doesNotMatch(question, /  /, "pas de double espace non plus");
});

test("une étape qui n'attend rien le dit, plutôt que « < 1 min d'attente »", () => {
  // Arrange — le formateur plancherait à « < 1 min », qui se lit comme une
  // mesure alors que c'est un zéro franc.
  const sansAttente = etape({ attente: 0 });

  // Act
  const question = questionDOptimisation(sansAttente, 10);

  // Assert
  assert.match(question, /sans jamais rien demander à l'humain/);
  assert.doesNotMatch(question, /< 1 min/);
  assert.doesNotMatch(
    question,
    /ce qu'elle demande à l'humain/,
    "la clôture se contredirait deux phrases après avoir dit qu'elle ne demande rien",
  );
});

test("une étape non observée pose une autre question, sans chiffre de temps", () => {
  // Arrange
  const morte = etape({ sessions: 0, lectures: 0, machine: 0, attente: 0 });

  // Act
  const question = questionDOptimisation(morte, 10);

  // Assert
  assert.match(question, /aucune des 10 séances/i);
  assert.doesNotMatch(question, /machine/, "il n'y a pas de temps à optimiser, il y a une étape morte");
  assert.match(question, /sert(-elle)? encore|pourquoi/i);
});

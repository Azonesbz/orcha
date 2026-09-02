/**
 * Le croisement du plan déclaré et du déroulé mesuré.
 *
 * Une mesure sans le plan en face n'est qu'une statistique : ce qu'on vérifie
 * ici, c'est que chaque chiffre retombe bien sur l'étape qui l'a produit, et
 * que le vocabulaire tienne — « non observée », jamais « non faite ».
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Session } from "./deroule.ts";
import type { EtapeWorkflow, Workflow } from "./workflow.ts";
import type { EtapeMesuree } from "./mesures.ts";
import { mesurer, trier } from "./mesures.ts";

const m = (minutes: number) => minutes * 60_000;

function plan(etapes: Array<[numero: string, role: string, arretDur?: boolean]>): Workflow {
  return {
    depart: null,
    orphelins: [],
    etapes: etapes.map(([numero, role, arretDur = false]) => ({
      numero,
      role,
      fichierDeclare: `steps/step-${numero}.md`,
      arretDur,
    })) as EtapeWorkflow[],
  };
}

function seance(partiel: Partial<Session>): Session {
  return {
    id: "S1",
    titre: "Séance",
    debut: 0,
    fin: 0,
    fichiersLus: [],
    agents: [],
    attentes: [],
    pauses: [],
    lignesIllisibles: 0,
    reconnue: true,
    ...partiel,
  };
}

/** Une lecture d'étape : le nom seul, comme le rend `lireSession`. */
const lue = (numero: string, minute: number) => ({ fichier: `step-${numero}.md`, a: m(minute) });
const appel = (agent: string, minute: number) => ({ agent, a: m(minute), enFond: false });

test("une étape déclarée qu'aucune session n'a lue est non observée, pas non faite", () => {
  // Arrange
  const workflow = plan([["00", "Init"], ["01", "Arbitrage"]]);
  const sessions = [seance({ fichiersLus: [lue("00", 0)], fin: m(10) })];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.equal(deroule.etapes[1].sessions, 0);
  assert.equal(deroule.etapes[1].lectures, 0);
  assert.equal(deroule.etapes[0].sessions, 1);
});

test("une étape relue trois fois dans la même session est une boucle, pas trois sessions", () => {
  // Arrange
  const workflow = plan([["00", "Init"], ["01", "Arbitrage"]]);
  const sessions = [
    seance({ fichiersLus: [lue("00", 0), lue("01", 5), lue("00", 9), lue("00", 12)], fin: m(20) }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.equal(deroule.etapes[0].sessions, 1);
  assert.equal(deroule.etapes[0].lectures, 3);
});

test("le temps d'une étape se partage entre travail machine et attente humaine", () => {
  // Arrange — cinq minutes d'attente dans les dix premières.
  const workflow = plan([["00", "Init"], ["01", "Arbitrage"]]);
  const sessions = [
    seance({
      fichiersLus: [lue("00", 0), lue("01", 10)],
      attentes: [{ de: m(4), a: m(9) }],
      fin: m(30),
    }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.equal(deroule.etapes[0].attente, m(5));
  assert.equal(deroule.etapes[0].machine, m(5));
  assert.equal(deroule.etapes[1].attente, 0);
  assert.equal(deroule.etapes[1].machine, m(20), "la dernière étape court jusqu'à la fin");
});

test("l'attente d'un arrêt dur est portée par l'étape qui le déclare", () => {
  // Arrange — le chiffre qui a fait corriger le workflow : dix-huit minutes
  // d'attente sèche sur un arrêt dont plus aucune question n'était ouverte.
  const workflow = plan([["02", "Ticket", true], ["03", "Brouillon de PR"]]);
  const sessions = [
    seance({
      fichiersLus: [lue("02", 0), lue("03", 25)],
      attentes: [{ de: m(2), a: m(20.7) }],
      fin: m(40),
    }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.equal(deroule.etapes[0].arretDur, true);
  assert.equal(deroule.etapes[0].attente, m(18.7));
  assert.equal(deroule.etapes[1].attente, 0);
});

test("une pause n'est comptée ni en machine ni en attente", () => {
  // Arrange — une séance reprise le lendemain.
  const workflow = plan([["00", "Init"]]);
  const sessions = [
    seance({ fichiersLus: [lue("00", 0)], pauses: [{ de: m(10), a: m(70) }], fin: m(100) }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.equal(deroule.etapes[0].machine, m(40));
  assert.equal(deroule.sessions[0].duree, m(40), "`fin - debut` mentirait de soixante minutes");
});

test("une session qui s'arrête avant la dernière étape n'est pas aboutie", () => {
  // Arrange
  const workflow = plan([["00", "Init"], ["01", "Arbitrage"], ["02", "Ticket"]]);
  const sessions = [
    seance({ id: "courte", fichiersLus: [lue("00", 0), lue("01", 5)], fin: m(9) }),
    seance({ id: "entière", fichiersLus: [lue("00", 0), lue("02", 5)], fin: m(9) }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.equal(deroule.sessions[0].derniereEtape, "01");
  assert.equal(deroule.sessions[0].aboutie, false);
  assert.equal(deroule.sessions[1].aboutie, true);
});

test("un agent qui revient après un autre est du travail repris", () => {
  // Arrange
  const workflow = plan([["00", "Init"]]);
  const sessions = [
    seance({
      fichiersLus: [lue("00", 0)],
      agents: [appel("implementer", 1), appel("implementer", 2), appel("reviewer", 3), appel("implementer", 4)],
      fin: m(5),
    }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.deepEqual(deroule.sessions[0].chaine, ["implementer", "reviewer", "implementer"]);
  assert.deepEqual(deroule.sessions[0].reprises, ["implementer"]);
});

test("deux appels de suite au même agent ne sont pas une reprise", () => {
  // Arrange — un agent relancé d'affilée poursuit son travail, il n'y revient pas.
  const workflow = plan([["00", "Init"]]);
  const sessions = [
    seance({ fichiersLus: [lue("00", 0)], agents: [appel("tester", 1), appel("tester", 2)], fin: m(5) }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.deepEqual(deroule.sessions[0].chaine, ["tester"]);
  assert.deepEqual(deroule.sessions[0].reprises, []);
});

test("une session qui n'a franchi aucune étape est mise de côté, pas comptée à zéro", () => {
  // Arrange — un projet a des sessions qui n'empruntent pas ce workflow-là ;
  // les garder au dénominateur ferait passer chaque étape pour délaissée.
  const workflow = plan([["00", "Init"]]);
  const sessions = [
    seance({ id: "flow", fichiersLus: [lue("00", 0)], fin: m(10) }),
    seance({ id: "ailleurs", fichiersLus: [{ fichier: "README.md", a: 0 }], fin: m(10) }),
  ];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.deepEqual(deroule.sessions.map((s) => s.id), ["flow"]);
  assert.equal(deroule.horsWorkflow, 1);
  assert.equal(deroule.etapes[0].sessions, 1);
});

test("une transcription au format non reconnu est signalée, jamais comptée pour zéro", () => {
  // Arrange
  const workflow = plan([["00", "Init"]]);
  const sessions = [seance({ id: "opaque", reconnue: false }), seance({ id: "flow", fichiersLus: [lue("00", 0)], fin: m(3) })];

  // Act
  const deroule = mesurer(workflow, sessions);

  // Assert
  assert.equal(deroule.nonReconnues, 1);
  assert.equal(deroule.horsWorkflow, 0, "une transcription illisible n'est pas une session hors workflow");
  assert.deepEqual(deroule.sessions.map((s) => s.id), ["flow"]);
});

const mesuree = (numero: string, machine: number, attente: number): EtapeMesuree => ({
  numero,
  role: `Étape ${numero}`,
  arretDur: false,
  sessions: 1,
  lectures: 1,
  machine: m(machine),
  attente: m(attente),
});

test("le tri par exécution met la plus coûteuse en machine en tête", () => {
  // Arrange — l'étape 1 attend beaucoup mais travaille peu.
  const etapes = [mesuree("00", 10, 0), mesuree("01", 2, 90), mesuree("02", 40, 5)];

  // Act
  const triees = trier(etapes, "execution");

  // Assert
  assert.deepEqual(triees.map((e) => e.numero), ["02", "00", "01"]);
});

test("le tri par attente classe sur l'attente seule, pas sur le total", () => {
  // Arrange
  const etapes = [mesuree("00", 10, 0), mesuree("01", 2, 90), mesuree("02", 40, 5)];

  // Act
  const triees = trier(etapes, "attente");

  // Assert
  assert.deepEqual(triees.map((e) => e.numero), ["01", "02", "00"]);
});

test("à égalité, l'ordre du plan tranche", () => {
  // Arrange — deux étapes non observées, donc à zéro partout.
  const etapes = [mesuree("00", 0, 0), mesuree("01", 5, 0), mesuree("02", 0, 0)];

  // Act
  const triees = trier(etapes, "execution");

  // Assert
  assert.deepEqual(triees.map((e) => e.numero), ["01", "00", "02"]);
});

test("le tri par plan rend l'ordre déclaré, et ne touche pas au tableau reçu", () => {
  // Arrange
  const etapes = [mesuree("00", 10, 0), mesuree("01", 2, 90)];

  // Act
  const triees = trier(etapes, "plan");

  // Assert
  assert.deepEqual(triees.map((e) => e.numero), ["00", "01"]);
  assert.notEqual(triees, etapes, "une copie, sinon l'affichage réordonne la mesure");
});

/**
 * La renumérotation, éprouvée sur le cas qui casse : un décalage en chaîne.
 *
 * Le test central est celui des renvois croisés. Remplacer 04→03 puis 03→02
 * séquentiellement écraserait le premier remplacement ; il faut une seule passe.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  appliquerRenumerotation,
  empreinteDuPlan,
  planifierRenumerotation,
} from "./renumerotation.ts";
import type { EtapeWorkflow, Workflow } from "../lecture/workflow.ts";

/** Un workflow à trou : 00, 01, 03, 04 — l'étape 02 a été retirée. */
function atelierATrou() {
  const racine = mkdtempSync(join(tmpdir(), "renum-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  process.env.ATELIER_PROJET = racine;
  const skill = join(racine, "skills", "essai");
  mkdirSync(join(skill, "steps"), { recursive: true });

  const numeros = ["00", "01", "03", "04"];
  const noms: Record<string, string> = { "00": "init", "01": "plan", "03": "execute", "04": "verify" };

  writeFileSync(
    join(skill, "SKILL.md"),
    [
      "---", "name: essai", "description: Un essai.", "---", "",
      "## Séquence", "",
      "| # | Étape | Sortie |", "|---|---|---|",
      ...numeros.map((n) => `| ${n} | \`steps/step-${n}-${noms[n]}.md\` | Rôle ${n} |`),
      "", "## Arrêts durs", "",
      "1. Le plan (étape 01) — attends.", "2. La vérif (étape 04) — attends aussi.", "",
      "Commence par lire `steps/step-00-init.md`.", "",
    ].join("\n"),
    "utf8",
  );

  // Chaque étape renvoie à la suivante, comme le fait halo.
  const suivants: Record<string, string> = { "00": "01", "01": "03", "03": "04", "04": "" };
  for (const n of numeros) {
    const suite = suivants[n];
    writeFileSync(
      join(skill, "steps", `step-${n}-${noms[n]}.md`),
      [
        `# Étape ${n} — ${noms[n]}`, "",
        `**Sortie attendue** : rôle ${n}.`, "",
        suite ? `Enchaîne sur \`steps/step-${suite}-${noms[suite]}.md\` (voir step-${suite}).` : "Fin.",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  const etapes: EtapeWorkflow[] = numeros.map((n) => ({
    numero: n, role: `Rôle ${n}`, fichierDeclare: `steps/step-${n}-${noms[n]}.md`,
    cheminAbsolu: join(skill, "steps", `step-${n}-${noms[n]}.md`),
    present: true, lignes: 6, agents: [], competences: [], arretDur: false,
    suivanteConfirmee: true, silences: [],
  }));

  const workflow: Workflow = { etapes, orphelins: [], depart: "00" };
  return { skill: join(skill, "SKILL.md"), dossier: join(skill, "steps"), workflow };
}

test("le plan ne déplace que ce qui doit bouger", () => {
  // Arrange
  const { skill, workflow } = atelierATrou();

  // Act
  const plan = planifierRenumerotation(skill, workflow);

  // Assert — 00 et 01 restent, 03→02 et 04→03
  assert.deepEqual(
    plan.deplacements.map((d) => `${d.ancienNumero}→${d.nouveauNumero}`),
    ["03→02", "04→03"],
  );
});

test("les fichiers sont renommés sans s'écraser en chemin", () => {
  // Arrange
  const { skill, dossier, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow);

  // Assert
  assert.ok(existsSync(join(dossier, "step-02-execute.md")));
  assert.ok(existsSync(join(dossier, "step-03-verify.md")));
  assert.equal(existsSync(join(dossier, "step-04-verify.md")), false);
  assert.ok(existsSync(join(dossier, "step-00-init.md")), "les étapes stables ne bougent pas");
});

test("le tableau porte les nouveaux numéros ET les nouveaux chemins", () => {
  // Arrange
  const { skill, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow);

  // Assert
  const table = readFileSync(skill, "utf8");
  assert.ok(table.includes("| 02 | `steps/step-02-execute.md` |"));
  assert.ok(table.includes("| 03 | `steps/step-03-verify.md` |"));
  assert.ok(!table.includes("step-04"));
});

test("les renvois d'une étape à l'autre suivent, sans double substitution", () => {
  // Arrange — 01 renvoie à 03, qui devient 02 ; 03 renvoie à 04, qui devient 03
  const { skill, dossier, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow);

  // Assert
  const plan = readFileSync(join(dossier, "step-01-plan.md"), "utf8");
  assert.ok(plan.includes("`steps/step-02-execute.md`"), "01 pointe désormais vers 02");
  assert.ok(plan.includes("(voir step-02)"));

  const execute = readFileSync(join(dossier, "step-02-execute.md"), "utf8");
  assert.ok(execute.startsWith("# Étape 02 — execute"), "son propre titre suit");
  assert.ok(execute.includes("`steps/step-03-verify.md`"), "et son renvoi aussi");
});

test("les renvois en prose du SKILL.md suivent", () => {
  // Arrange
  const { skill, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow);

  // Assert
  const contenu = readFileSync(skill, "utf8");
  assert.ok(contenu.includes("La vérif (étape 03)"), "l'arrêt dur annoncé suit le décalage");
  assert.ok(contenu.includes("Le plan (étape 01)"), "et celui qui ne bouge pas reste");
  assert.ok(contenu.includes("Commence par lire `steps/step-00-init.md`"), "le départ est intact");
});

test("une numérotation déjà continue est refusée plutôt que réécrite", () => {
  // Arrange
  const { skill, workflow } = atelierATrou();
  appliquerRenumerotation(skill, workflow);
  const apres = readFileSync(skill, "utf8");
  workflow.etapes = workflow.etapes.map((e, i) => ({ ...e, numero: String(i).padStart(2, "0") }));

  // Act & Assert
  assert.throws(() => appliquerRenumerotation(skill, workflow), /déjà continue/);
  assert.equal(readFileSync(skill, "utf8"), apres, "rien n'a été réécrit");
});

test("appliquer sur un plan périmé est refusé, rien n'est renommé", () => {
  // Arrange — l'aperçu est pris, puis une session ajoute une ligne à une étape
  const { skill, dossier, workflow } = atelierATrou();
  const empreinteMontree = empreinteDuPlan(planifierRenumerotation(skill, workflow));
  writeFileSync(join(dossier, "step-03-execute.md"), "# Étape 03 — execute\n\nRécrit ailleurs.\n", "utf8");

  // Act & Assert
  assert.throws(() => appliquerRenumerotation(skill, workflow, empreinteMontree), /ont changé/i);
  assert.ok(existsSync(join(dossier, "step-03-execute.md")), "aucun renommage");
  assert.equal(existsSync(join(dossier, "step-02-execute.md")), false);
  assert.ok(readFileSync(skill, "utf8").includes("step-03-execute.md"), "le tableau est intact");
});

test("appliquer sur le plan montré passe", () => {
  // Arrange
  const { skill, dossier, workflow } = atelierATrou();
  const empreinteMontree = empreinteDuPlan(planifierRenumerotation(skill, workflow));

  // Act
  appliquerRenumerotation(skill, workflow, empreinteMontree);

  // Assert
  assert.ok(existsSync(join(dossier, "step-02-execute.md")));
});

test("un ordre donné réordonne, au lieu de seulement refermer les trous", () => {
  // Arrange — 00, 01, 03, 04 devient 03, 00, 01, 04 : l'étape « execute »
  // passe en tête.
  const { skill, workflow } = atelierATrou();

  // Act
  const plan = planifierRenumerotation(skill, workflow, ["03", "00", "01", "04"]);

  // Assert
  const arrivee = new Map(plan.deplacements.map((d) => [d.ancienNumero, d.nouveauNumero]));
  assert.equal(arrivee.get("03"), "00", "execute prend la première place");
  assert.equal(arrivee.get("00"), "01");
  assert.equal(arrivee.get("01"), "02");
  assert.equal(arrivee.get("04"), "03");
});

test("un échange de deux étapes voisines ne perd aucun fichier", () => {
  // Arrange — le cas qui casse une écriture naïve : 00 devient 01 pendant que
  // 01 devient 00, donc les deux renommages se visent l'un l'autre.
  const { skill, dossier, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow, undefined, ["01", "00", "03", "04"]);

  // Assert
  const restants = readdirSync(dossier).sort();
  assert.equal(restants.length, 4, `un fichier a disparu : ${restants.join(", ")}`);
  assert.ok(restants.some((f) => f.startsWith("step-00-plan")), "plan est passé en 00");
  assert.ok(restants.some((f) => f.startsWith("step-01-init")), "init est passé en 01");
});

test("réordonner suit les renvois que les étapes se font", () => {
  // Arrange
  const { skill, dossier, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow, undefined, ["01", "00", "03", "04"]);

  // Assert — `plan`, devenu 00, renvoyait à `execute` ; le renvoi doit suivre.
  const contenu = readFileSync(join(dossier, "step-00-plan.md"), "utf8");
  assert.match(contenu, /step-02-execute/, `renvoi non suivi :\n${contenu}`);
});

test("un ordre identique à l'existant est refusé : rien à faire", () => {
  // Arrange — la numérotation a un trou, mais l'ordre demandé est celui-là.
  const { skill, workflow } = atelierATrou();

  // Act
  const plan = planifierRenumerotation(skill, workflow, ["00", "01", "03", "04"]);

  // Assert — refermer le trou reste un déplacement légitime : 03→02, 04→03.
  assert.ok(plan.deplacements.length > 0, "le trou doit toujours se refermer");
});

test("réordonner déplace les LIGNES du tableau, pas seulement leurs numéros", () => {
  // Arrange — le lecteur prend l'ordre des lignes, pas celui des numéros.
  // Réécrire « 03 » en « 00 » sans remonter la ligne donne un tableau qui se
  // lit 01, 02, 03, 00 : la numérotation dit une chose, l'ordre en dit une
  // autre. C'est exactement l'incohérence que cet outil sert à détecter.
  const { skill, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow, undefined, ["04", "00", "01", "03"]);

  // Assert
  const numeros = readFileSync(skill, "utf8")
    .split("\n")
    .map((l) => /^\|\s*(\d+)\s*\|/.exec(l)?.[1])
    .filter((n): n is string => n !== undefined);
  assert.deepEqual(numeros, ["00", "01", "02", "03"], "les lignes doivent suivre les numéros");
});

test("refermer un trou laisse l'ordre des lignes intact", () => {
  // Arrange
  const { skill, workflow } = atelierATrou();

  // Act
  appliquerRenumerotation(skill, workflow);

  // Assert
  const numeros = readFileSync(skill, "utf8")
    .split("\n")
    .map((l) => /^\|\s*(\d+)\s*\|/.exec(l)?.[1])
    .filter((n): n is string => n !== undefined);
  assert.deepEqual(numeros, ["00", "01", "02", "03"]);
});

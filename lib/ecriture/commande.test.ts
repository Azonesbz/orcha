/**
 * Créer, réécrire et retirer une commande — sans jamais effacer.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { creerCommande, retirerCommande } from "./commande.ts";

function racineJetable(): string {
  const racine = mkdtempSync(join(tmpdir(), "commande-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  process.env.ATELIER_PROJET = racine;
  return racine;
}

/** Une commande posée à la main, pour les gestes qui modifient l'existant. */
function poser(racine: string, nom: string, corps = "Ancien corps.\n"): string {
  const chemin = join(racine, "commands", `${nom}.md`);
  mkdirSync(join(racine, "commands"), { recursive: true });
  writeFileSync(
    chemin,
    ["---", `description: Relire un diff.`, "argument-hint: [fichier] <quoi>", "---", "", corps].join("\n"),
    "utf8",
  );
  return chemin;
}

test("une commande créée porte sa description et son indice d'argument", () => {
  // Arrange
  racineJetable();

  // Act
  const chemin = creerCommande("utilisateur", {
    nom: "relire",
    description: "Relit le diff courant et signale ce qui cloche.",
    indiceArgument: "[fichier] <quoi regarder>",
  });

  // Assert
  const contenu = readFileSync(chemin, "utf8");
  assert.ok(chemin.endsWith("/commands/relire.md"));
  assert.ok(contenu.includes("description: Relit le diff courant et signale ce qui cloche."));
  assert.ok(contenu.includes("argument-hint: [fichier] <quoi regarder>"));
  assert.ok(contenu.includes("$ARGUMENTS"), "le squelette montre où atterrit ce qui est tapé");
});

test("une commande sans description est refusée", () => {
  // Arrange
  racineJetable();

  // Act & Assert
  assert.throws(
    () => creerCommande("utilisateur", { nom: "muette", description: "  ", indiceArgument: "" }),
    /description/i,
  );
});

test("un nom invalide est refusé avant toute écriture", () => {
  // Arrange
  racineJetable();

  // Act & Assert
  assert.throws(
    () => creerCommande("utilisateur", { nom: "Ma Commande", description: "x", indiceArgument: "" }),
    /nom valide/i,
  );
});

test("créer deux fois la même commande est refusé, sans écraser", () => {
  // Arrange
  racineJetable();
  const premier = creerCommande("utilisateur", { nom: "double", description: "La vraie.", indiceArgument: "" });

  // Act & Assert
  assert.throws(
    () => creerCommande("utilisateur", { nom: "double", description: "L'imposteur.", indiceArgument: "" }),
    /existe déjà/i,
  );
  assert.ok(readFileSync(premier, "utf8").includes("La vraie."));
});

test("retirer déplace la commande hors de commands/ au lieu de l'effacer", () => {
  // Arrange
  const racine = racineJetable();
  const chemin = poser(racine, "relire");

  // Act
  const destination = retirerCommande(chemin);

  // Assert
  assert.ok(!existsSync(chemin), "la commande ne charge plus");
  assert.ok(existsSync(destination), "le fichier est déplacé, jamais effacé");
  assert.ok(readFileSync(destination, "utf8").includes("Ancien corps."), "au contenu près");
  // Claude Code lit les sous-dossiers de commands/ comme des espaces de noms :
  // une « retirée » posée dessous resterait chargée sous /retirees:relire.
  assert.ok(!destination.includes("/commands/"), "la destination est hors de commands/");
});

test("retirer deux fois la même commande ne recouvre pas la première", () => {
  // Arrange
  const racine = racineJetable();
  const destination = retirerCommande(poser(racine, "relire", "La première.\n"));
  poser(racine, "relire", "La seconde.\n");

  // Act & Assert
  assert.throws(() => retirerCommande(join(racine, "commands", "relire.md")), /existe déjà/i);
  assert.ok(readFileSync(destination, "utf8").includes("La première."));
});

test("une commande fournie par un plugin est refusée au retrait", () => {
  // Arrange — un plugin est un clone de dépôt : toute modification y serait
  // écrasée au prochain « claude plugin update », sans un mot.
  const racine = racineJetable();
  const chemin = join(racine, "plugins", "cache", "dev-methodology", "commands", "flow.md");
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, ["---", "description: Pipeline.", "---", "", "Corps du plugin.", ""].join("\n"), "utf8");

  // Act & Assert
  assert.throws(() => retirerCommande(chemin), /plugin/i);
  assert.ok(readFileSync(chemin, "utf8").includes("Corps du plugin."), "rien n'a bougé");
});

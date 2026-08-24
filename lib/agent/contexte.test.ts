/**
 * Ce que l'agent sait de l'écran d'où on l'appelle.
 *
 * Le contexte est déduit de la route et non passé en props : la coquille ne
 * peut pas recevoir le contexte des pages, et le déduire côté serveur évite de
 * le faire voyager en double. Ce qui se teste ici, c'est ce mappage — et
 * surtout le périmètre, puisque c'est lui qui borne l'écriture.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { contexteDe } from "./contexte.ts";

/** Un ~/.claude jetable avec une compétence à soi et une de plugin. */
function atelierJetable(): { racine: string; mienne: string; duPlugin: string } {
  const racine = mkdtempSync(join(tmpdir(), "ctx-"));
  process.env.CLAUDE_CONFIG_DIR = racine;
  delete process.env.ATELIER_PROJET;

  const mienne = join(racine, "skills", "grilling", "SKILL.md");
  mkdirSync(join(racine, "skills", "grilling"), { recursive: true });
  writeFileSync(mienne, "---\nname: grilling\ndescription: Griller.\n---\n\n## Étapes\n\n1. Un.\n", "utf8");

  const duPlugin = join(racine, "plugins", "cache", "giva", "skills", "flux", "SKILL.md");
  mkdirSync(join(racine, "plugins", "cache", "giva", "skills", "flux"), { recursive: true });
  writeFileSync(duPlugin, "---\nname: flux\ndescription: Flux.\n---\n\nCorps.\n", "utf8");

  return { racine, mienne, duPlugin };
}

test("la racine donne le tableau de bord, à l'échelle de tout l'atelier", () => {
  // Arrange
  const { racine } = atelierJetable();

  // Act
  const c = contexteDe("/");

  // Assert
  assert.match(c.titre, /vue d'ensemble/i);
  assert.equal(c.dossier, racine);
  assert.ok(c.suggestions.length > 0);
});

test("l'écran des workflows propose d'en créer un", () => {
  // Arrange
  atelierJetable();

  // Act
  const c = contexteDe("/workflows");

  // Assert
  assert.ok(
    c.suggestions.some((s) => /cr[ée]e/i.test(s)),
    `aucune suggestion de création : ${c.suggestions.join(" / ")}`,
  );
});

test("le plan d'un workflow propose de l'auditer, et se borne à son dossier", () => {
  // Arrange
  const { mienne } = atelierJetable();

  // Act
  const c = contexteDe(`/workflow/${encodeURIComponent(mienne)}`);

  // Assert
  assert.ok(
    c.suggestions.some((s) => /audit/i.test(s)),
    `aucune suggestion d'audit : ${c.suggestions.join(" / ")}`,
  );
  assert.equal(c.dossier, join(process.env.CLAUDE_CONFIG_DIR!, "skills", "grilling"));
  assert.equal(c.peutEcrire, true);
});

test("un fichier de plugin se lit mais ne s'écrit pas", () => {
  // Arrange — un plugin est un clone réécrit à la prochaine mise à jour :
  // y écrire serait perdu en silence, et c'est l'écart que l'outil détecte.
  const { duPlugin } = atelierJetable();

  // Act
  const c = contexteDe(`/competence/${encodeURIComponent(duPlugin)}`);

  // Assert
  assert.equal(c.peutEcrire, false);
});

test("l'éditeur d'un fichier donne son contenu à l'agent", () => {
  // Arrange
  const { mienne } = atelierJetable();

  // Act
  const c = contexteDe(`/competence/${encodeURIComponent(mienne)}`);

  // Assert
  assert.match(c.resume, /grilling/);
  assert.match(c.resume, /## Étapes/);
});

test("une route inconnue retombe sur un contexte général plutôt que de lever", () => {
  // Arrange
  const { racine } = atelierJetable();

  // Act
  const c = contexteDe("/route/qui/n/existe/pas");

  // Assert
  assert.equal(c.dossier, racine);
  assert.ok(c.titre.length > 0);
});

test("un chemin de fichier absent ne fait pas tomber l'écran", () => {
  // Arrange
  atelierJetable();

  // Act
  const c = contexteDe(`/etape/${encodeURIComponent("/nulle/part/etape.md")}`);

  // Assert
  assert.equal(c.peutEcrire, false);
  assert.ok(c.titre.length > 0);
});

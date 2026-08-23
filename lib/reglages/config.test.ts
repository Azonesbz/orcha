/**
 * La configuration d'Orcha — dont la clé d'API.
 *
 * Deux exigences se croisent ici. La première : une configuration absente ou
 * abîmée ne doit jamais empêcher l'écran de s'afficher — Orcha lit d'abord, et
 * une lecture ne dépend pas d'une clé. La seconde : le fichier porte un secret,
 * il n'est donc lisible que par son propriétaire.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_PAR_DEFAUT, ecrireConfig, lireConfig, masquer } from "./config.ts";

function bacASable(): string {
  return join(mkdtempSync(join(tmpdir(), "orcha-config-")), "config.json");
}

test("une configuration absente rend les valeurs par défaut sans lever", () => {
  // Arrange
  process.env.ORCHA_CONFIG = bacASable();

  // Act
  const config = lireConfig();

  // Assert
  assert.deepEqual(config, CONFIG_PAR_DEFAUT);
});

test("un fichier illisible rend les valeurs par défaut plutôt que de casser l'écran", () => {
  // Arrange
  const chemin = bacASable();
  writeFileSync(chemin, "{ ceci n'est pas du JSON");
  process.env.ORCHA_CONFIG = chemin;

  // Act
  const config = lireConfig();

  // Assert
  assert.deepEqual(config, CONFIG_PAR_DEFAUT);
});

test("la date de vérification survit à une écriture qui ne la vise pas", () => {
  // Arrange
  process.env.ORCHA_CONFIG = bacASable();
  ecrireConfig({ cleApi: "sk-ant-secret", verifieeLe: "2026-08-23T10:00:00.000Z" });

  // Act
  ecrireConfig({ modele: "claude-sonnet-5" });

  // Assert
  assert.equal(lireConfig().verifieeLe, "2026-08-23T10:00:00.000Z");
});

test("écrire ne touche qu'aux clés fournies", () => {
  // Arrange
  process.env.ORCHA_CONFIG = bacASable();
  ecrireConfig({ cleApi: "sk-ant-secret", modele: "claude-haiku-4-5" });

  // Act
  ecrireConfig({ modele: "claude-opus-5" });

  // Assert
  assert.deepEqual(lireConfig(), { cleApi: "sk-ant-secret", modele: "claude-opus-5", verifieeLe: "" });
});

test("le fichier qui porte la clé n'est lisible que par son propriétaire", () => {
  // Arrange
  const chemin = bacASable();
  process.env.ORCHA_CONFIG = chemin;

  // Act
  ecrireConfig({ cleApi: "sk-ant-secret" });

  // Assert
  assert.equal(statSync(chemin).mode & 0o777, 0o600);
});

test("un modèle inconnu retombe sur celui par défaut : le disque n'impose pas l'interface", () => {
  // Arrange
  const chemin = bacASable();
  writeFileSync(chemin, JSON.stringify({ modele: "gpt-4" }));
  process.env.ORCHA_CONFIG = chemin;

  // Act
  const config = lireConfig();

  // Assert
  assert.equal(config.modele, CONFIG_PAR_DEFAUT.modele);
});

test("masquer ne laisse voir que la fin de la clé, jamais son début utile", () => {
  // Arrange
  const cle = "sk-ant-api03-9XkQ2bAbCdEf";

  // Act
  const masquee = masquer(cle);

  // Assert
  assert.equal(masquee, "sk-ant-…AbCdEf");
  assert.equal(masquer(""), "");
});

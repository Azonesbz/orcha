/**
 * Les arguments passés au CLI — la seule frontière où l'écriture se décide.
 *
 * L'agent d'Orcha écrit directement : ce qui l'empêche de sortir du périmètre,
 * c'est cette ligne de commande et rien d'autre. On la teste donc en la
 * construisant, sans lancer quoi que ce soit — un test qui lancerait un agent
 * pour vérifier qu'il n'écrit pas serait exactement le mauvais test.
 */

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { argumentsDeLAgent, suivreLAgent, sansPreambule } from "./agent.ts";
import { enClair, refuserSiSessionMorte } from "./proposition.ts";
import type { Geste } from "./flux.ts";

/** Le générateur vidé, pour l'affirmer d'un bloc. */
async function tousLesGestes(flux: AsyncGenerator<Geste>): Promise<Geste[]> {
  const vus: Geste[] = [];
  for await (const geste of flux) vus.push(geste);
  return vus;
}

afterEach(() => {
  delete process.env.ATELIER_PUBLIC;
});

const SESSION = "11111111-2222-3333-4444-555555555555";

const CONTEXTE = {
  titre: "Plan du workflow lancer",
  resume: "Séquence : 00, 01, 02.",
  dossier: "/Users/x/.claude/skills/lancer",
  peutEcrire: true,
  suggestions: [],
};

test("en lecture seule, ni Edit ni Write ne sont accordés", () => {
  // Arrange
  const contexte = { ...CONTEXTE, peutEcrire: false };

  // Act
  const args = argumentsDeLAgent(contexte, "Audite ce workflow", "claude-opus-5", SESSION, true);

  // Assert
  const outils = args[args.indexOf("--allowedTools") + 1];
  assert.doesNotMatch(outils, /Edit|Write/);
  assert.match(outils, /Read/);
});

test("sur le déploiement public, l'agent refuse avant même de chercher le CLI", async () => {
  // Arrange — l'écran rend un 404 là-bas, mais la route reste joignable. Le
  // refus doit tomber au passage obligé, pas dépendre de la page.
  process.env.ATELIER_PUBLIC = "1";

  // Act
  const gestes = await tousLesGestes(
    suivreLAgent(CONTEXTE, "Ouvre une PR", "claude-opus-5", SESSION, true),
  );

  // Assert
  assert.equal(gestes.length, 1);
  assert.equal(gestes[0].sorte, "echec");
  assert.match(gestes[0].quoi, /ta machine/);
});

test("une demande vide ne lance rien", async () => {
  // Arrange
  const vide = "   ";

  // Act
  const gestes = await tousLesGestes(suivreLAgent(CONTEXTE, vide, "claude-opus-5", SESSION, true));

  // Assert
  assert.deepEqual(gestes.map((g) => g.sorte), ["echec"]);
});

test("en écriture, aucune liste d'outils : l'agent a tout ce que Claude Code sait faire", () => {
  // Arrange — restreindre ne bornait plus rien depuis que `Bash` était accordé :
  // un shell sort de n'importe quelle liste. La liste ne faisait qu'amputer
  // l'agent des serveurs MCP, des compétences et des shells en arrière-plan.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ouvre une PR", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args.includes("--allowedTools"), false);
  assert.equal(args[args.indexOf("--permission-mode") + 1], "bypassPermissions");
});

test("le périmètre passé au CLI est celui du contexte, jamais la machine entière", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--add-dir") + 1], CONTEXTE.dossier);
});

test("l'instruction et le contexte partent ensemble, sous -p", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite ce workflow", "claude-opus-5", SESSION, true);

  // Assert
  const invite = args[args.indexOf("-p") + 1];
  assert.match(invite, /Audite ce workflow/);
  assert.match(invite, /Séquence : 00, 01, 02/);
});

test("la doctrine du produit accompagne chaque appel", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  const doctrine = args[args.indexOf("--append-system-prompt") + 1];
  assert.match(doctrine, /plugin/i, "ne jamais écrire dans un plugin");
  assert.match(doctrine, /étape/i, "une étape déclarée a toujours son fichier");
});

test("le modèle demandé est celui passé", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite", "claude-haiku-4-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--model") + 1], "claude-haiku-4-5");
});

test("une session morte est un refus, pas une réponse", () => {
  // Arrange — le CLI l'écrit sur stdout avec un code de retour 0 : sans ce
  // contrôle, l'échec s'affiche comme si le modèle l'avait dit.
  const sortie = "Failed to authenticate: OAuth session expired and could not be refreshed";

  // Act
  const geste = () => refuserSiSessionMorte(sortie);

  // Assert
  assert.throws(geste, /expirée/i);
});

test("une réponse normale passe sans encombre", () => {
  // Arrange
  const sortie = "Ce workflow déclare 7 étapes, dont une sans fichier.";

  // Act
  refuserSiSessionMorte(sortie);

  // Assert
  assert.ok(true, "aucune levée attendue");
});

test("une session expirée remontée par le lanceur se dit en français, avec le geste", () => {
  // Arrange — ce que `lancerClaude` rejette réellement, vérifié en conditions.
  const erreur = new Error("Failed to authenticate: OAuth session expired and could not be refreshed");

  // Act
  const dit = enClair(erreur);

  // Assert
  assert.match(dit, /expirée/);
  assert.match(dit, /terminal/, "il faut dire quoi faire, pas seulement ce qui cloche");
});

test("le premier tour ouvre la session et porte le contexte", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--session-id") + 1], SESSION);
  assert.equal(args.includes("--resume"), false);
  assert.match(args[args.indexOf("-p") + 1], /Séquence : 00, 01, 02/);
});

test("les tours suivants reprennent la session, sans réexpédier le contexte", () => {
  // Arrange — le CLI tient l'historique : le renvoyer à chaque tour gonflerait
  // l'invite et ferait relire à l'agent ce qu'il sait déjà.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Et l'étape 02 ?", "claude-opus-5", SESSION, false);

  // Assert
  assert.equal(args[args.indexOf("--resume") + 1], SESSION);
  assert.equal(args.includes("--session-id"), false);
  const invite = args[args.indexOf("-p") + 1];
  assert.equal(invite, "Et l'étape 02 ?");
  assert.doesNotMatch(invite, /Séquence/);
});

test("la doctrine n'est envoyée qu'à l'ouverture", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const suite = argumentsDeLAgent(contexte, "Et ensuite ?", "claude-opus-5", SESSION, false);

  // Assert
  assert.equal(suite.includes("--append-system-prompt"), false);
});

test("changer d'écran en cours de conversation rappelle le nouveau contexte", () => {
  // Arrange — la discussion suit l'utilisateur : on ne repart pas de zéro,
  // on lui dit où il regarde maintenant.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Et ici ?", "claude-opus-5", SESSION, false, true);

  // Assert
  assert.equal(args[args.indexOf("--resume") + 1], SESSION, "la même conversation continue");
  assert.match(args[args.indexOf("-p") + 1], /Je regarde maintenant/);
  assert.match(args[args.indexOf("-p") + 1], /Séquence : 00, 01, 02/);
});

test("un mode est imposé : en `-p`, aucun humain ne peut répondre à une invite", () => {
  // Arrange — sans mode, l'agent restait suspendu à la première écriture.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args.includes("--permission-mode"), true);
});

test("le dépôt est ouvert à l'agent, en plus du dossier de configuration", () => {
  // Arrange — c'est ce qui manquait pour qu'une pull request soit seulement
  // possible : sans le dépôt dans le périmètre, l'agent voit la configuration
  // et pas le code qu'elle sert.
  const contexte = { ...CONTEXTE, projet: "/Users/x/dev/ai-giva" };

  // Act
  const args = argumentsDeLAgent(contexte, "Ouvre une PR", "claude-opus-5", SESSION, true);

  // Assert
  const ouverts = args.filter((a, i) => args[i - 1] === "--add-dir");
  assert.deepEqual(ouverts, [CONTEXTE.dossier, "/Users/x/dev/ai-giva"]);
});

test("sans projet lu, seul le dossier de configuration est ouvert", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Audite", "claude-opus-5", SESSION, true);

  // Assert
  const ouverts = args.filter((a, i) => args[i - 1] === "--add-dir");
  assert.deepEqual(ouverts, [CONTEXTE.dossier]);
});

test("un plugin reste en lecture seule, dépôt ouvert ou non", () => {
  // Arrange — la règle qui ne bouge pas : un plugin est un clone réécrit à la
  // prochaine mise à jour, y écrire serait perdu en silence.
  const contexte = { ...CONTEXTE, peutEcrire: false, projet: "/Users/x/dev/ai-giva" };

  // Act
  const args = argumentsDeLAgent(contexte, "Modifie ça", "claude-opus-5", SESSION, true);

  // Assert
  const outils = args[args.indexOf("--allowedTools") + 1];
  assert.doesNotMatch(outils, /Bash|Edit|Write/);
});

test("le dossier reste borné, quel que soit le mode", () => {
  // Arrange
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--add-dir") + 1], CONTEXTE.dossier);
});

test("le préambule qui précède le titre est retiré de la réponse", () => {
  // Arrange — le message final d'un agent commence par la fin de son dernier
  // geste : « Bon, plus qu'une seule référence… ». Lu seul dans le panneau,
  // ça ouvre sur un raisonnement dont personne n'a vu le début.
  const brut = [
    "Bon, plus qu'une seule référence — les autres mentions sont descriptives.",
    "",
    "## Résumé",
    "",
    "**Diagnostic** : l'étape 6 fait deux métiers dans un seul fichier.",
  ].join("\n");

  // Act
  const affiche = sansPreambule(brut);

  // Assert
  assert.ok(affiche.startsWith("## Résumé"), affiche);
  assert.ok(affiche.includes("deux métiers"), "le corps reste entier");
});

test("une réponse sans titre n'est pas amputée", () => {
  // Arrange
  const brut = "Constat : le fichier est déjà aussi resserré que possible.";

  // Act
  const affiche = sansPreambule(brut);

  // Assert
  assert.equal(affiche, brut);
});

test("un titre déjà en tête ne déclenche aucune coupe", () => {
  // Arrange
  const brut = "## Résumé\n\nModifié step-06 : la boucle est condensée.";

  // Act
  const affiche = sansPreambule(brut);

  // Assert
  assert.equal(affiche, brut);
});

test("un titre trop loin dans le texte ne fait pas jeter la réponse", () => {
  // Arrange — sinon une vraie réponse qui titre sa dernière section perdrait
  // tout ce qui la précède, c'est-à-dire l'essentiel.
  const brut = `${"Une analyse détaillée. ".repeat(40)}\n\n## Pour aller plus loin\n\nEnsuite.`;

  // Act
  const affiche = sansPreambule(brut);

  // Assert
  assert.equal(affiche, brut);
});

test("le CLI rend son flux, pas un bloc à la fin", () => {
  // Arrange — en `text`, l'écran n'avait que « Thinking… » pendant des minutes,
  // puis un bloc. Le flux est ce qui rend le travail visible pendant qu'il se
  // fait, et `--verbose` est ce que le CLI exige pour le rendre sous `-p`.
  const contexte = CONTEXTE;

  // Act
  const args = argumentsDeLAgent(contexte, "Ajoute une étape", "claude-opus-5", SESSION, true);

  // Assert
  assert.equal(args[args.indexOf("--output-format") + 1], "stream-json");
  assert.ok(args.includes("--verbose"));
});

test("la doctrine réclame une réponse qu'on puisse comprendre seule", () => {
  // Arrange — le reproche d'usage était là : l'agent rendait trois lignes dont
  // on ne savait ni ce qu'elles touchaient, ni ce qu'il fallait en faire.
  const contexte = CONTEXTE;

  // Act
  const doctrine = argumentsDeLAgent(contexte, "Ajoute", "claude-opus-5", SESSION, true)[
    argumentsDeLAgent(contexte, "Ajoute", "claude-opus-5", SESSION, true).indexOf(
      "--append-system-prompt",
    ) + 1
  ];

  // Assert
  assert.match(doctrine, /nomme/i, "chaque fichier touché doit être nommé");
  assert.match(doctrine, /suite|ensuite|maintenant/i, "il doit dire quoi faire après");
  assert.match(doctrine, /demande|question/i, "devant une demande floue, il questionne au lieu d'écrire");
});

test("l'agent demande les fragments de texte : la réponse s'écrit mot à mot", () => {
  // Arrange & Act
  const args = argumentsDeLAgent({ ...CONTEXTE, peutEcrire: false }, "Salut", "claude-opus-5", SESSION, true);

  // Assert
  assert.ok(args.includes("--include-partial-messages"), "sans ce drapeau, la réponse tombe d'un bloc");
  assert.equal(args[args.indexOf("--output-format") + 1], "stream-json");
});

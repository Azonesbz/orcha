import type { NextConfig } from "next";

/**
 * Outil local : il lit et écrit le dossier .claude de la machine.
 *
 * L'écoute est bornée à 127.0.0.1 dans les scripts de `package.json`, et ce
 * n'est pas une précaution de confort. Aucune action serveur n'est
 * authentifiée : sur `0.0.0.0`, n'importe qui sur le même réseau pouvait
 * réécrire un SKILL.md de ~/.claude, c'est-à-dire déposer des instructions que
 * Claude Code exécuterait à la session suivante. Ne pas retirer `--hostname`.
 */
const config: NextConfig = {
  /* Le paquet npm est assemblé depuis ce build autonome : le serveur et ses
     seules dépendances réelles, pas les 600 Mo de node_modules. C'est ce que
     `scripts/empaqueter.mjs` recopie dans `paquet/`. */
  output: "standalone",
  typedRoutes: true,
  // Pas de CLAUDE.md ni d'AGENTS.md générés : les conventions vivent dans le vault.
  agentRules: false,
};

export default config;

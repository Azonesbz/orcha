/**
 * Les plugins Codex : le déclaré moins le présent, comme pour Claude Code.
 *
 * Déclaré dans `config.toml` — `[plugins."nom@marketplace"] enabled = true` —,
 * présent dans `plugins/cache/<marketplace>/<nom>/<version>/`. Un plugin
 * activé sans copie ne chargera pas, et rien ne le dira.
 */

import { join } from "node:path";
import type { Plugin, Silence } from "../../types.ts";
import { contientUnFichier } from "../fichiers.ts";
import { lireToml, table } from "./toml.ts";

export function lirePluginsCodex(racine: string): Plugin[] {
  const declares = table(lireToml(join(racine, "config.toml")).valeur.plugins);
  return Object.entries(declares)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([identifiant, bloc]) => depuisDeclaration(racine, identifiant, table(bloc).enabled === true));
}

function depuisDeclaration(racine: string, identifiant: string, actif: boolean): Plugin {
  const arobase = identifiant.lastIndexOf("@");
  const nom = arobase === -1 ? identifiant : identifiant.slice(0, arobase);
  const marketplace = arobase === -1 ? "" : identifiant.slice(arobase + 1);
  const chemin = join(racine, "plugins", "cache", marketplace, nom);
  const present = contientUnFichier(chemin);

  return {
    identifiant,
    marketplace,
    active: actif,
    cheminInstallation: chemin,
    present,
    silences: actif && !present ? [copieAbsente(chemin)] : [],
  };
}

function copieAbsente(chemin: string): Silence {
  return {
    cause: "activé, aucune copie dans plugins/cache",
    detail: `Déclaré actif dans config.toml, mais ${chemin} est vide ou absent. Le plugin ne chargera pas.`,
  };
}

/**
 * Les agents Codex : un TOML par agent dans `agents/`.
 *
 * Trois champs obligatoires — `name`, `description`, `developer_instructions` —
 * et c'est le `name` qui fait l'identité, comme chez Claude Code. Le reste du
 * modèle est partagé : un agent Codex se présente dans la même liste, avec la
 * même pastille, que son homologue Markdown.
 */

import { basename, join } from "node:path";
import type { Agent, Portee, Silence } from "../../types.ts";
import { MODELE_DE_SESSION, OUTILS_HERITES } from "../documents.ts";
import { estDossier, listerFichiers } from "../fichiers.ts";
import { lireToml, texte } from "./toml.ts";

export function lireAgentsCodex(racine: string, portee: Portee, origine: string): Agent[] {
  const dossier = join(racine, "agents");
  if (!estDossier(dossier)) return [];
  return listerFichiers(dossier, ".toml").map((f) => depuisToml(join(dossier, f), portee, origine));
}

function depuisToml(chemin: string, portee: Portee, origine: string): Agent {
  const { valeur, erreur } = lireToml(chemin);
  const description = texte(valeur.description);
  const corps = texte(valeur.developer_instructions);

  return {
    nom: texte(valeur.name) || basename(chemin, ".toml"),
    portee,
    origine,
    chemin,
    description,
    // Codex n'a pas de champ `tools` : un agent hérite toujours des outils.
    outils: OUTILS_HERITES,
    modele: texte(valeur.model) || MODELE_DE_SESSION,
    corps,
    silences: erreur ? [illisible(erreur)] : manques(valeur.name, description, corps),
  };
}

function illisible(erreur: string): Silence {
  return {
    cause: "TOML illisible",
    detail: `${erreur}. Codex ignore l'agent sans le dire : le fichier est là, il ne sert à rien.`,
  };
}

function manques(nom: unknown, description: string, corps: string): Silence[] {
  const trouves: Silence[] = [];
  if (!texte(nom)) {
    trouves.push({
      cause: "aucun name",
      detail: "Codex désigne un agent par son champ name : sans lui, rien ne permet de l'appeler.",
    });
  }
  if (!description) {
    trouves.push({
      cause: "aucune description",
      detail: "Sans description, le modèle ne saura jamais quand déléguer à cet agent.",
    });
  }
  if (!corps) {
    trouves.push({
      cause: "aucune developer_instructions",
      detail: "L'agent existe, mais sans consigne : il ne fera rien de particulier.",
    });
  }
  return trouves;
}

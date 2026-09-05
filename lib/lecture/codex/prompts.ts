/**
 * Les prompts Codex : ce que Claude Code appelle des commandes.
 *
 * Même fichier — un Markdown, un frontmatter `description` et `argument-hint`,
 * un `$ARGUMENTS` dans le corps — et un même écran. Une différence, et elle
 * compte : Codex ne lit que le premier niveau de `prompts/`. Chez Claude Code,
 * `commands/giva/cadrer.md` devient `/giva:cadrer` ; chez Codex, il n'est
 * jamais proposé. On le liste, et on le dit.
 */

import { basename, join } from "node:path";
import type { Commande, Portee, Silence } from "../../types.ts";
import { decouper, estDossier, listerDossiers, listerFichiers, lireTexte } from "../fichiers.ts";
import { texte } from "./toml.ts";

const ENFOUI: Silence = {
  cause: "dans un sous-dossier",
  detail: "Codex ne lit que le premier niveau de prompts/. Ce fichier n'est jamais proposé.",
};

export function lirePrompts(racine: string, portee: Portee, origine: string): Commande[] {
  const dossier = join(racine, "prompts");
  if (!estDossier(dossier)) return [];

  const auPremierNiveau = listerFichiers(dossier, ".md").map((f) =>
    depuisFichier(join(dossier, f), basename(f, ".md"), portee, origine, []),
  );
  const enfouis = listerDossiers(dossier).flatMap((sous) =>
    listerFichiers(join(dossier, sous), ".md").map((f) =>
      depuisFichier(join(dossier, sous, f), `${sous}/${basename(f, ".md")}`, portee, origine, [ENFOUI]),
    ),
  );
  return [...auPremierNiveau, ...enfouis];
}

/** Pas de `name:` chez Codex : le prompt se tape `/prompts:<fichier>`. */
function depuisFichier(
  chemin: string,
  nom: string,
  portee: Portee,
  origine: string,
  silences: Silence[],
): Commande {
  const { entete, corps } = decouper(lireTexte(chemin) ?? "");
  return {
    nom,
    portee,
    origine,
    chemin,
    description: texte(entete.description),
    indiceArgument: texte(entete["argument-hint"]),
    corps,
    silences,
  };
}

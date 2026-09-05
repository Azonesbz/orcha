/**
 * Les agents et les commandes : un fichier Markdown, un frontmatter, un nom.
 *
 * Les deux se ressemblent tellement sur le disque qu'on les confond, mais ils
 * ne se déclenchent pas pareil : un agent est choisi par le modèle d'après sa
 * description, une commande est tapée par l'utilisateur.
 *
 * L'identité vient du champ `name` quand il est là, du nom de fichier sinon.
 * Vérifié le 14 août 2026 sur 2.1.227 : c'est le `name` qui s'affiche.
 *
 * Les sous-dossiers comptent. Claude Code charge `agents/giva-flow/investigator.md`
 * comme `agents/designer.md` — `giva-flow` l'appelle, et ça tourne — et une
 * commande dans `commands/giva/cadrer.md` s'invoque en `/giva:cadrer`. Une
 * lecture arrêtée au premier niveau ne voyait ni les uns ni les autres :
 * absents de l'inventaire, jamais résolus dans un plan de workflow.
 */

import { basename, join } from "node:path";
import type { Agent, Commande, Portee, Silence } from "../types.ts";
import { decouper, estDossier, listerDossiers, listerFichiers, lireTexte } from "./fichiers.ts";

/* Ce que dit un agent qui ne déclare ni `tools` ni `model`. Nommé plutôt que
   recopié : l'éditeur doit pouvoir distinguer « rien de déclaré » d'une vraie
   liste d'outils, et comparer deux littéraux identiques à distance est
   exactement ce qui finit par diverger. */
export const OUTILS_HERITES = "hérités de la session";
export const MODELE_DE_SESSION = "celui de la session";

export function lireAgents(racine: string, portee: Portee, origine: string): Agent[] {
  return lireDossier(racine, "agents", portee, origine).map(({ nom, entete, corps, chemin, silences }) => ({
    nom,
    portee,
    origine,
    chemin,
    description: texte(entete.description),
    outils: texte(entete.tools) || OUTILS_HERITES,
    modele: texte(entete.model) || MODELE_DE_SESSION,
    corps,
    silences: [...silences, ...sansDescription(entete, "Sans description, le modèle ne saura jamais quand déléguer à cet agent.")],
  }));
}

export function lireCommandes(racine: string, portee: Portee, origine: string): Commande[] {
  return lireDossier(racine, "commands", portee, origine).map(({ nom, espace, entete, corps, chemin, silences }) => ({
    // `commands/giva/cadrer.md` se tape `/giva:cadrer` : le sous-dossier est
    // l'espace de noms. Un `name` de frontmatter, lui, s'affiche tel quel.
    nom: texte(entete.name) || [...espace, nom].join(":"),
    portee,
    origine,
    chemin,
    description: texte(entete.description),
    indiceArgument: texte(entete["argument-hint"]),
    corps,
    silences,
  }));
}

interface Brut {
  nom: string;
  /** Les sous-dossiers entre `agents/` ou `commands/` et le fichier, dans l'ordre. */
  espace: string[];
  entete: Record<string, unknown>;
  corps: string;
  chemin: string;
  silences: Silence[];
}

/** Trois niveaux suffisent : au-delà, ce n'est plus un rangement, c'est un dépôt. */
const PROFONDEUR = 3;

function lireDossier(racine: string, sous: string, _portee: Portee, _origine: string): Brut[] {
  const dossier = join(racine, sous);
  if (!estDossier(dossier)) return [];

  return [...fichiersSous(dossier, PROFONDEUR)].map(({ chemin, fichier, espace }) => {
    const brut = lireTexte(chemin) ?? "";
    const { entete, corps, enteteValide } = decouper(brut);
    const nomFichier = basename(fichier, ".md");
    const silences: Silence[] = [];

    if (!enteteValide) {
      silences.push({
        cause: "frontmatter absent ou illisible",
        detail: "Le fichier est là, mais rien ne permet de le présenter ni de le déclencher.",
      });
    }
    // L'identité d'un agent est son champ `name`, pas le nom du fichier — test
    // contrôlé du 14 août 2026 sur 2.1.227 : « fichier-bbb.md » portant
    // `name: frontmatter-yyy` se présente sous « frontmatter-yyy ». Signaler la
    // divergence comme une anomalie serait un faux positif.
    return { nom: texte(entete.name) || nomFichier, espace, entete, corps, chemin, silences };
  });
}

/** Les `.md` d'un dossier et de ses sous-dossiers, avec le chemin relatif qui y mène. */
function* fichiersSous(
  dossier: string,
  profondeur: number,
  espace: string[] = [],
): Generator<{ chemin: string; fichier: string; espace: string[] }> {
  for (const fichier of listerFichiers(dossier, ".md")) {
    yield { chemin: join(dossier, fichier), fichier, espace };
  }
  if (profondeur <= 1) return;
  for (const nom of listerDossiers(dossier)) {
    yield* fichiersSous(join(dossier, nom), profondeur - 1, [...espace, nom]);
  }
}

function sansDescription(entete: Record<string, unknown>, detail: string): Silence[] {
  return texte(entete.description) ? [] : [{ cause: "aucune description", detail }];
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

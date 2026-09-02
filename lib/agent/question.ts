/**
 * La question qu'une ligne du déroulé pose à l'agent.
 *
 * Orcha mesure et n'interprète pas — c'est sa promesse, et elle tient : ce
 * module n'appelle aucun modèle, il rédige une phrase. L'interprétation reste à
 * l'humain, ou à l'agent s'il décide de la lui demander.
 *
 * La question emporte ses chiffres. Sans eux, l'agent ouvre le fichier d'étape
 * et raisonne sur le texte déclaré — exactement ce que la mesure existe pour
 * dépasser.
 */

import type { EtapeMesuree } from "../lecture/mesures.ts";
import { duree } from "../temps.ts";

export function questionDOptimisation(etape: EtapeMesuree, sur: number): string {
  const nommee = `l'étape ${etape.numero} « ${etape.role} »${etape.arretDur ? ", qui déclare un arrêt dur," : ""}`;

  // Une étape jamais franchie n'a pas de temps à optimiser : elle a un autre
  // problème, et poser la question du coût dessus n'aurait aucun sens.
  if (etape.sessions === 0) {
    return [
      `Sur les transcriptions lues, ${nommee} n'a été observée dans aucune des ${sur} séances : aucune n'a lu son fichier.`,
      `Lis-la, puis dis-moi pourquoi elle n'est pas franchie et si elle sert encore.`,
      `Attention : une étape que l'orchestrateur a déjà en contexte ne se relit pas, donc « non observée » ne prouve pas « non faite ».`,
    ].join(" ");
  }

  return [
    // `boucle` se colle au mot qui précède : passé par le `join`, son absence
    // laissait une espace avant la virgule — « 10 séances , et coûte ».
    `Sur les transcriptions lues, ${nommee} est franchie dans ${etape.sessions} des ${sur} séances${boucle(etape)},` +
      ` et coûte ${duree(etape.machine)} de travail machine ${cotéHumain(etape)}.`,
    cloture(etape),
  ].join(" ");
}

/**
 * Ce qu'on demande, une fois les chiffres posés.
 *
 * Une étape qui n'attend rien ne se voit pas demander ce qui vient de son
 * attente : la question se contredirait deux phrases plus loin.
 */
function cloture(etape: EtapeMesuree): string {
  const commun = "Lis son fichier, puis dis-moi comment la rendre moins coûteuse";
  const fin = "Propose des changements concrets dans le fichier.";
  if (etape.attente === 0) return `${commun}. ${fin}`;
  return `${commun} — ce qui vient de l'étape elle-même, et ce qui vient de ce qu'elle demande à l'humain. ${fin}`;
}

/** Zéro se dit « rien » : « < 1 min d'attente » se lisait comme une mesure. */
function cotéHumain(etape: EtapeMesuree): string {
  if (etape.attente === 0) return "sans jamais rien demander à l'humain";
  return `pour ${duree(etape.attente)} d'attente humaine`;
}

/** Relue plus souvent que franchie : l'orchestrateur y revient. */
function boucle(etape: EtapeMesuree): string {
  if (etape.lectures <= etape.sessions) return "";
  return `, relue ${etape.lectures} fois en tout — donc reprise`;
}

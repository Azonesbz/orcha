/**
 * Le garde-fou d'une compétence : hors des racines connues, dans un plugin, ou
 * hors d'un SKILL.md, on refuse. Un plugin est un clone de dépôt que la machine
 * ne possède pas — le modifier serait perdu au prochain `plugin update`.
 *
 * Il ne reste que le garde : la réécriture chirurgicale du frontmatter qui
 * vivait ici est partie avec le panneau « Modifier avec Claude ». C'est l'agent
 * qui écrit, et sa doctrine porte la même règle — ne jamais re-sérialiser.
 */

import { cheminModifiable, EcritureRefusee } from "./garde.ts";

/** Le garde partagé, plus la seule règle propre aux compétences. */
export function verifierChemin(chemin: string): string {
  const absolu = cheminModifiable(chemin);
  if (!absolu.endsWith("/SKILL.md")) {
    throw new EcritureRefusee("Seuls les fichiers SKILL.md sont modifiables ici.");
  }
  return absolu;
}

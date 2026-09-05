/**
 * Un agent Claude Code — frontmatter et corps — dans la forme TOML de Codex.
 *
 * Trois champs obligatoires chez Codex : `name`, `description`,
 * `developer_instructions`. Le `model` passe s'il est déclaré ; `tools` n'a
 * pas d'équivalent et ne s'écrit pas. Le corps s'écrit entre `'''`, comme
 * Codex le fait lui-même quand il migre : un humain doit pouvoir le relire.
 */

import { stringify } from "smol-toml";

export interface AgentAConvertir {
  nom: string;
  description: string;
  modele: string;
  corps: string;
}

export function agentEnToml(agent: AgentAConvertir): string {
  const lignes = [
    `name = ${chaine(agent.nom)}`,
    `description = ${chaine(agent.description)}`,
    ...(agent.modele ? [`model = ${chaine(agent.modele)}`] : []),
    `developer_instructions = ${multiligne(agent.corps)}`,
  ];
  return `${lignes.join("\n")}\n`;
}

/** Une chaîne d'une ligne, échappée par la bibliothèque : elle sait mieux. */
function chaine(valeur: string): string {
  return stringify({ v: valeur }).replace(/^v = /, "").trimEnd();
}

/**
 * Un littéral `'''` quand c'est possible : rien n'y est interprété, tout se
 * relit tel quel. Sinon — trois apostrophes dans le corps — une chaîne
 * basique échappée, moins lisible mais toujours juste.
 */
function multiligne(valeur: string): string {
  if (valeur.includes("'''")) return chaine(valeur);
  const corps = valeur.endsWith("\n") ? valeur : `${valeur}\n`;
  return `'''\n${corps}'''`;
}

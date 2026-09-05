/**
 * Des hooks lus à plat, remis dans la forme de `hooks.json`.
 *
 * La lecture aplatit chaque entrée avec son événement et son matcher ; Codex
 * attend l'inverse — un objet par événement, un groupe par matcher. Même
 * forme que `settings.json` chez Claude Code, à la clé près.
 */

import type { Hook } from "../../types.ts";

interface Groupe {
  matcher?: string;
  hooks: Array<{ type: "command"; command: string; timeout?: number }>;
}

export function hooksEnJson(hooks: Hook[]): string {
  const parEvenement: Record<string, Groupe[]> = {};
  for (const h of hooks) {
    const groupes = (parEvenement[h.evenement] ??= []);
    let groupe = groupes.find((g) => (g.matcher ?? "") === h.matcher);
    if (!groupe) {
      groupe = h.matcher ? { matcher: h.matcher, hooks: [] } : { hooks: [] };
      groupes.push(groupe);
    }
    groupe.hooks.push({ type: "command", command: h.commande, ...(h.delai ? { timeout: h.delai } : {}) });
  }
  return `${JSON.stringify({ hooks: parEvenement }, null, 2)}\n`;
}

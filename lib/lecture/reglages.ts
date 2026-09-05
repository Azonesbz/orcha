/**
 * Les hooks et les permissions, tels qu'ils sont déclarés dans les réglages.
 *
 * Les permissions ne suivent pas la précédence habituelle : elles FUSIONNENT
 * entre portées au lieu de s'écraser, et `deny` l'emporte toujours. Une règle
 * qu'on croit désactivée en la retirant d'un fichier peut donc survivre dans
 * un autre — c'est ce que l'interface doit rendre visible.
 */

import { join } from "node:path";
import type { Hook, Portee, ReglePermission, Silence } from "../types.ts";
import { lireJson } from "./fichiers.ts";

const DECISIONS = ["allow", "deny", "ask"] as const;
const FICHIERS = ["settings.json", "settings.local.json"] as const;

export function lireHooks(racine: string, portee: Portee): Hook[] {
  return FICHIERS.flatMap((fichier) =>
    hooksDepuisBloc(lireJson(join(racine, fichier)).hooks, portee, fichier),
  );
}

/**
 * La valeur de `hooks`, d'où qu'elle vienne : `settings.json` chez Claude Code,
 * `hooks.json` ou le bloc `[hooks]` de `config.toml` chez Codex — la même
 * forme, un objet par événement.
 */
export function hooksDepuisBloc(hooks: unknown, portee: Portee, origine: string): Hook[] {
  if (!hooks || typeof hooks !== "object") return [];
  const trouves: Hook[] = [];
  for (const [evenement, groupes] of Object.entries(hooks as Record<string, unknown>)) {
    if (!Array.isArray(groupes)) continue;
    for (const groupe of groupes) {
      trouves.push(...depuisGroupe(evenement, groupe, portee, origine));
    }
  }
  return trouves;
}

function depuisGroupe(evenement: string, groupe: unknown, portee: Portee, origine: string): Hook[] {
  if (!groupe || typeof groupe !== "object") return [];
  const bloc = groupe as Record<string, unknown>;
  const liste = Array.isArray(bloc.hooks) ? bloc.hooks : [];

  return liste.map((entree: unknown) => {
    const h = (entree ?? {}) as Record<string, unknown>;
    return {
      evenement,
      matcher: typeof bloc.matcher === "string" ? bloc.matcher : "",
      commande: typeof h.command === "string" ? h.command : "",
      delai: typeof h.timeout === "number" ? h.timeout : 0,
      portee,
      origine,
      silences: silencesDuHook(bloc.matcher, h.command),
    };
  });
}

function silencesDuHook(matcher: unknown, commande: unknown): Silence[] {
  const trouves: Silence[] = [];
  if (matcher !== undefined && typeof matcher !== "string") {
    trouves.push({
      cause: "matcher au mauvais type",
      detail: "Un matcher qui n'est pas une chaîne invalide le fichier de réglages ENTIER, pas seulement ce hook.",
    });
  }
  if (typeof commande !== "string" || !commande.trim()) {
    trouves.push({ cause: "commande vide", detail: "Le hook est déclaré et n'exécute rien." });
  }
  return trouves;
}

export function lirePermissions(racine: string, portee: Portee): ReglePermission[] {
  const trouves: ReglePermission[] = [];
  for (const fichier of FICHIERS) {
    const bloc = lireJson(join(racine, fichier)).permissions;
    if (!bloc || typeof bloc !== "object") continue;

    for (const decision of DECISIONS) {
      const motifs = (bloc as Record<string, unknown>)[decision];
      if (!Array.isArray(motifs)) continue;
      for (const motif of motifs) {
        trouves.push({ decision, motif: String(motif), portee, origine: fichier });
      }
    }
  }
  return trouves;
}

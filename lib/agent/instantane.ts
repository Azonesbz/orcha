/**
 * L'instantané d'un dossier, avant que l'agent n'y écrive.
 *
 * L'agent d'Orcha écrit directement : c'est un choix assumé, mais il retire le
 * garde-fou central du produit — « rien n'est écrit sans Appliquer ». Et
 * `~/.claude` n'est pas un dépôt git : sans ce filet, une modification ratée est
 * définitive.
 *
 * La restauration n'est donc pas une copie inverse : elle **remplace** le
 * dossier. Recopier par-dessus laisserait en place ce que l'agent a créé —
 * trois étapes de trop, et le workflow reste incohérent. C'est exactement la
 * leçon de `deployer.sh` : un tar recouvre, il ne supprime pas.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { cheminConfig } from "../reglages/config.ts";

export interface Instantane {
  id: string;
  /** Le dossier d'origine — restaurer n'a donc besoin que de l'identité. */
  dossier: string;
  /** Quand, en ISO. Pour l'afficher sans le recalculer. */
  pris: string;
}

export class InstantaneIntrouvable extends Error {}

/** Rangés à côté de la configuration, hors de `.claude` que l'outil inventorie. */
function racineDesInstantanes(): string {
  return join(dirname(cheminConfig()), "instantanes");
}

export function prendreInstantane(dossier: string): Instantane {
  if (!existsSync(dossier)) {
    throw new InstantaneIntrouvable(`${dossier} n'existe pas : rien à sauvegarder.`);
  }

  const pris = new Date().toISOString();
  // L'horodatage seul collerait deux instantanés pris dans la même
  // milliseconde ; le compteur les sépare sans dépendre du hasard.
  const id = `${pris.replace(/[:.]/g, "-")}-${readdirSync(sur(racineDesInstantanes())).length}`;
  const cible = join(racineDesInstantanes(), id);

  mkdirSync(cible, { recursive: true });
  cpSync(dossier, join(cible, "contenu"), { recursive: true });
  mkdirSync(join(cible, "origine", encodeURIComponent(dossier)), { recursive: true });

  return { id, dossier, pris };
}

export function listerInstantanes(): Instantane[] {
  return readdirSync(sur(racineDesInstantanes()))
    .map((id) => relire(id))
    .filter((i): i is Instantane => i !== null)
    .sort((a, b) => b.pris.localeCompare(a.pris));
}

/**
 * Remet le dossier dans l'état de l'instantané, à l'octet près.
 *
 * Par bascule et non par recopie : l'ancien contenu part de côté, la copie
 * prend sa place, puis l'ancien est effacé. Une restauration interrompue laisse
 * donc l'un ou l'autre en place, jamais un mélange des deux.
 */
export function restaurer(id: string): Instantane {
  const instantane = relire(id);
  if (!instantane) throw new InstantaneIntrouvable(`Instantané « ${id} » introuvable.`);

  const contenu = join(racineDesInstantanes(), id, "contenu");
  const ecarte = `${instantane.dossier}.orcha-remplace`;

  rmSync(ecarte, { recursive: true, force: true });
  if (existsSync(instantane.dossier)) renameSync(instantane.dossier, ecarte);
  cpSync(contenu, instantane.dossier, { recursive: true });
  rmSync(ecarte, { recursive: true, force: true });

  return instantane;
}

function relire(id: string): Instantane | null {
  const base = join(racineDesInstantanes(), id);
  const origines = readdirSync(sur(join(base, "origine")));
  if (origines.length === 0 || !existsSync(join(base, "contenu"))) return null;

  return {
    id,
    dossier: decodeURIComponent(origines[0]),
    pris: statSync(base).birthtime.toISOString(),
  };
}

/** Un dossier qui existe : `readdirSync` sur l'absent lèverait pour rien. */
function sur(chemin: string): string {
  mkdirSync(chemin, { recursive: true });
  return chemin;
}

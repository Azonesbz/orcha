/**
 * La ligne de pied du rail : où tourne l'application, et en quelle version.
 *
 * Elle atteste, comme tout ce qui est en mono : l'adresse est celle sur
 * laquelle le serveur écoute vraiment, pas une constante recopiée. Les valeurs
 * par défaut sont celles des scripts de `package.json` — c'est le seul cas où
 * Next ne renseigne pas ces variables lui-même.
 */
import paquet from "@/package.json";

export const VERSION = paquet.version;

export function piedDeRail(): string {
  const hote = process.env.HOSTNAME || "127.0.0.1";
  const port = process.env.PORT || "4300";
  return `local · ${hote}:${port} · v${VERSION}`;
}

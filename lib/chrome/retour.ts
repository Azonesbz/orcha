import type { Route } from "next";

/**
 * D'où l'on vient, et où le lien de retour ramène.
 *
 * Un éditeur ouvert depuis le plan d'un workflow doit ramener AU PLAN, pas à
 * l'inventaire : on y était pour corriger une étape, on veut reprendre la
 * lecture là où on l'a laissée. Le chemin du workflow voyage donc en paramètre
 * de requête, et l'écran s'en sert plutôt que de deviner.
 */
export interface Retour {
  href: Route;
  libelle: string;
}

export function retourDepuis(retour: string | undefined, defaut: Retour): Retour {
  if (!retour) return defaut;
  return {
    href: `/workflow/${encodeURIComponent(retour)}` as Route,
    libelle: "retour au plan",
  };
}

/** Le paramètre à accrocher à un lien pour qu'il sache revenir ici. */
export function versLEditeur(base: string, chemin: string, retour: string): Route {
  return `${base}/${encodeURIComponent(chemin)}?retour=${encodeURIComponent(retour)}` as Route;
}

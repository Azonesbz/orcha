"use client";

import { useEffect, useState } from "react";
import { avancer, motsRestants, pasDeRevelation } from "@/lib/agent/lissage";

/** Trente millisecondes entre deux mots : sous le seuil où l'œil voit des à-coups. */
const CADENCE_MS = 30;

/**
 * Le texte à afficher, qui rattrape la cible mot à mot.
 *
 * Un texte déjà complet au montage — un tour relu depuis la mémoire — s'affiche
 * tel quel : seul ce qui arrive pendant qu'on regarde se déroule. Quand la
 * cible est remplacée plutôt que prolongée, on repart du début ; un simple
 * blanc de fin en moins ne compte pas comme un remplacement.
 */
export function useMotAMot(cible: string, enCours: boolean): string {
  const [affiche, setAffiche] = useState(enCours ? "" : cible);

  useEffect(() => {
    const minuterie = setInterval(() => {
      setAffiche((courant) => {
        const depuis = pointDeReprise(cible, courant);
        if (depuis >= cible.length) {
          clearInterval(minuterie);
          return cible;
        }
        return cible.slice(0, avancer(cible, depuis, pasDeRevelation(motsRestants(cible, depuis))));
      });
    }, CADENCE_MS);
    return () => clearInterval(minuterie);
  }, [cible]);

  return affiche;
}

function pointDeReprise(cible: string, courant: string): number {
  if (cible.startsWith(courant)) return courant.length;
  const sansBlancs = courant.trimEnd();
  return cible.startsWith(sansBlancs) ? sansBlancs.length : 0;
}

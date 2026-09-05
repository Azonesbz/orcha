"use client";

import { useState } from "react";
import { FiltreInventaire } from "@/components/FiltreInventaire";
import { Agents, Competences, Prompts } from "@/components/codex/PanneauxFichiers";
import { Hooks, Instructions, Plugins } from "@/components/codex/PanneauxCodex";
import type { AtelierCodex } from "@/lib/lecture/codex/atelier";

/**
 * L'inventaire d'un `.codex`, filtrable comme l'autre.
 *
 * Le filtre est un `useState` et un `includes`, comme pour `.claude` : sur
 * quelques dizaines de lignes rendues au serveur, c'est tout ce qu'il faut.
 */
export function InventaireCodex({ atelier }: { atelier: AtelierCodex }) {
  const [filtre, setFiltre] = useState("");
  const [projetSeul, setProjetSeul] = useState(false);
  const garde = (...champs: string[]) =>
    filtre.trim() === "" || champs.some((c) => c.toLowerCase().includes(filtre.trim().toLowerCase()));
  const duProjet = (portee: string) => !projetSeul || portee === "projet";

  return (
    <>
      <FiltreInventaire filtre={filtre} surFiltre={setFiltre} projetSeul={projetSeul} surProjetSeul={setProjetSeul} />
      <Competences competences={atelier.competences.filter((c) => duProjet(c.portee) && garde(c.nom, c.description, c.origine))} />
      <Agents agents={atelier.agents.filter((a) => duProjet(a.portee) && garde(a.nom, a.description, a.origine))} />
      <Prompts prompts={atelier.commandes.filter((c) => duProjet(c.portee) && garde(c.nom, c.description, c.origine))} />
      <Plugins plugins={projetSeul ? [] : atelier.plugins} />
      <Hooks hooks={atelier.hooks.filter((h) => duProjet(h.portee) && garde(h.evenement, h.commande, h.matcher))} />
      <Instructions instructions={atelier.instructions.filter((f) => duProjet(f.portee))} />
    </>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { FiltreDrapeaux } from "@/components/FiltreDrapeaux";
import { PlanWorkflow } from "@/components/PlanWorkflow";
import { reordonner, type Retour } from "./actions";
import type { Drapeau } from "@/lib/lecture/drapeaux";
import type { Workflow } from "@/lib/lecture/workflow";

const VIERGE: Retour = { etat: "vierge", message: "" };

/**
 * Le plan, avec le glisser qui réordonne.
 *
 * Le composant du plan reste ignorant du serveur : il produit un ordre, on
 * l'envoie. Un formulaire caché plutôt qu'un `fetch` — c'est une écriture sur
 * le disque, elle passe par une action serveur comme toutes les autres.
 */
export function PlanReordonnable({
  workflow,
  destinations,
  cheminSkill,
  modifiable,
  drapeaux,
}: {
  workflow: Workflow;
  destinations: Record<string, string>;
  cheminSkill: string;
  modifiable: boolean;
  /** Les drapeaux déclarés par le SKILL.md — vide, le filtre n'apparaît pas. */
  drapeaux: Drapeau[];
}) {
  const [retour, action, enCours] = useActionState(reordonner, VIERGE);
  const [choisi, setChoisi] = useState<string | null>(null);
  const actif = drapeaux.find((d) => d.drapeau === choisi);
  const sautees = actif?.actives
    ? new Set(workflow.etapes.map((e) => e.numero).filter((n) => !actif.actives!.includes(n)))
    : undefined;

  // Le formulaire est soumis par le code, jamais par un bouton : c'est le
  // relâchement de la souris qui vaut validation.
  useEffect(() => {
    if (retour.etat === "refuse") console.warn("réordonnancement refusé :", retour.message);
  }, [retour]);

  return (
    <form action={action} data-plan>
      <input type="hidden" name="skill" value={cheminSkill} />
      {drapeaux.length > 0 && (
        <FiltreDrapeaux drapeaux={drapeaux} total={workflow.etapes.length} choisi={choisi} onChoisir={setChoisi} />
      )}
      <PlanWorkflow
        workflow={workflow}
        destinations={destinations}
        sautees={sautees}
        fin={actif?.finAnticipee ?? null}
        surReordre={
          modifiable && !enCours
            ? (ordre) => {
                const champ = document.createElement("input");
                champ.type = "hidden";
                champ.name = "ordre";
                champ.value = ordre.join(",");
                const formulaire = document.querySelector<HTMLFormElement>("form[data-plan]");
                if (!formulaire) return;
                formulaire.querySelector('input[name="ordre"]')?.remove();
                formulaire.appendChild(champ);
                formulaire.requestSubmit();
              }
            : undefined
        }
      />
      {retour.etat !== "vierge" && (
        <p
          role={retour.etat === "refuse" ? "alert" : "status"}
          className={`mt-3 font-mono text-meta ${
            retour.etat === "refuse" ? "text-danger" : "text-accent-soft"
          }`}
        >
          {retour.message}
        </p>
      )}
      {enCours && <p className="shimmer mt-3 font-mono text-meta">renumérotation en cours…</p>}
    </form>
  );
}

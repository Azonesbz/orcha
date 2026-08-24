"use client";

import { useActionState, useEffect } from "react";
import { PlanWorkflow } from "@/components/PlanWorkflow";
import { reordonner, type Retour } from "./actions";
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
}: {
  workflow: Workflow;
  destinations: Record<string, string>;
  cheminSkill: string;
  modifiable: boolean;
}) {
  const [retour, action, enCours] = useActionState(reordonner, VIERGE);

  // Le formulaire est soumis par le code, jamais par un bouton : c'est le
  // relâchement de la souris qui vaut validation.
  useEffect(() => {
    if (retour.etat === "refuse") console.warn("réordonnancement refusé :", retour.message);
  }, [retour]);

  return (
    <form action={action} data-plan>
      <input type="hidden" name="skill" value={cheminSkill} />
      <PlanWorkflow
        workflow={workflow}
        destinations={destinations}
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

"use client";

import { useActionState, useState } from "react";
import { Icone } from "@/components/icones";
import { Modale } from "@/components/Modale";
import { creer, type RetourCreation } from "./actions";

const VIERGE: RetourCreation = { etat: "vierge", message: "" };

/**
 * Créer une commande, depuis la liste où elle apparaîtra.
 *
 * La description n'est pas décorative : c'est elle qui présente la commande
 * dans `/help`, dans la liste que Claude Code déroule à la frappe, et au
 * modèle s'il l'appelle lui-même. Sans elle, l'écriture est refusée.
 */
export function CreationCommande() {
  const [ouverte, setOuverte] = useState(false);
  // React vide lui-même un formulaire non contrôlé après une action : la
  // saisie ne reste donc jamais armée pour un second clic, et le refus du
  // doublon côté serveur n'a pas à rattraper une soumission de trop.
  const [retour, action, enCours] = useActionState(creer, VIERGE);

  return (
    <>
      <button type="button" onClick={() => setOuverte(true)} className="btn-primary">
        <Icone nom="commande" taille={15} />
        Créer une commande
      </button>

      <Modale
        ouverte={ouverte}
        onFermer={() => setOuverte(false)}
        titre="Créer une commande"
        aide="Écrit commands/<nom>.md. Le corps part à Claude tel quel quand tu tapes /<nom>."
      >
        <form action={action} className="space-y-2">
          <input name="nom" required placeholder="nom-en-minuscules" className="field" />
          <textarea
            name="description"
            rows={2}
            required
            placeholder="Ce que fait la commande — c'est ce qui s'affiche dans /help"
            className="field"
          />
          <input name="indice" placeholder="argument-hint (facultatif)" className="field font-mono" />
          <select name="portee" className="field">
            <option value="utilisateur">portée utilisateur (~/.claude)</option>
            <option value="projet">portée projet (.claude du projet)</option>
          </select>
          <button type="submit" disabled={enCours} className="btn-primary w-full">
            {enCours ? "Écriture…" : "Créer la commande"}
          </button>
          {retour.etat !== "vierge" && (
            <p
              role={retour.etat === "refuse" ? "alert" : "status"}
              className={`text-xs ${retour.etat === "fait" ? "text-ink-soft" : "text-danger"}`}
            >
              {retour.message}
            </p>
          )}
        </form>
      </Modale>
    </>
  );
}

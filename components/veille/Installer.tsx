"use client";

import { useActionState } from "react";
import { Icone } from "@/components/icones";
import { installer, type RetourVeille } from "@/app/(local)/veille/actions";

const VIERGE: RetourVeille = { etat: "vierge", message: "" };

/**
 * Le geste d'installation — le seul bouton primaire de cet écran.
 *
 * Il copie le hook dans le dossier de l'utilisateur et le déclare. Il n'y a pas
 * de bouton pour le retirer : la charte l'interdit, Orcha ne supprime rien. Un
 * hook se retire en enlevant son entrée de settings.json, à la main.
 */
export function Installer({ libelle, aide }: { libelle: string; aide: string }) {
  const [retour, action, enCours] = useActionState(installer, VIERGE);

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
      <button type="submit" disabled={enCours} className="btn-primary">
        <Icone nom="valider" taille={14} trait={2.2} />
        {enCours ? "Écriture…" : libelle}
      </button>
      <span className="font-mono text-meta text-muted">{aide}</span>
      {retour.etat !== "vierge" && (
        <span
          role={retour.etat === "refuse" ? "alert" : "status"}
          className={`w-full font-mono text-meta ${
            retour.etat === "refuse" ? "text-danger" : "text-accent-soft"
          }`}
        >
          {retour.message}
        </span>
      )}
    </form>
  );
}

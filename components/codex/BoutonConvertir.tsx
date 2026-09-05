"use client";

import { useActionState } from "react";
import { Icone } from "@/components/icones";
import { lancerConversion, type RetourConversion } from "@/app/(local)/codex/actions";

const VIERGE: RetourConversion = { etat: "vierge", message: "" };

/** Un clic écrit ce que le plan au-dessus a montré. Rien de plus, rien par-dessus. */
export function BoutonConvertir({ portee, aEcrire }: { portee: "utilisateur" | "projet"; aEcrire: number }) {
  const [retour, action, enCours] = useActionState(lancerConversion, VIERGE);

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
      <input type="hidden" name="portee" value={portee} />
      <button type="submit" disabled={enCours || aEcrire === 0} className="btn-primary">
        <Icone nom="codex" taille={15} />
        {enCours ? "Écriture…" : aEcrire === 0 ? "Rien à écrire" : `Écrire ${aEcrire} élément${aEcrire > 1 ? "s" : ""}`}
      </button>
      {retour.etat !== "vierge" && (
        <p
          role={retour.etat === "refuse" ? "alert" : "status"}
          className={`text-description ${retour.etat === "fait" ? "text-ink-soft" : "text-danger"}`}
        >
          {retour.message}
        </p>
      )}
    </form>
  );
}

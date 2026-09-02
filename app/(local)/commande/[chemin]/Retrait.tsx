"use client";

import { useActionState, useState } from "react";
import { Icone } from "@/components/icones";
import { Modale } from "@/components/Modale";
import { retirer, type RetourRetrait } from "./actions";

const VIERGE: RetourRetrait = { message: "" };

/**
 * Retirer la commande regardée, en un temps.
 *
 * Le retrait d'une étape se confirme en deux, parce qu'il touche deux fichiers
 * dont l'un n'est pas à l'écran. Ici il n'y en a qu'un, et son chemin absolu
 * est déjà sous le titre : montrer un aperçu de ce qui est affiché n'ajouterait
 * rien. Rien n'est effacé — le fichier quitte `commands/` pour `retirees/`.
 */
export function Retrait({ chemin, nom }: { chemin: string; nom: string }) {
  const [ouverte, setOuverte] = useState(false);
  const [retour, action, enCours] = useActionState(retirer, VIERGE);

  return (
    <>
      <button type="button" onClick={() => setOuverte(true)} className="btn-ghost">
        <Icone nom="retirer" taille={15} />
        Retirer
      </button>

      <Modale
        ouverte={ouverte}
        onFermer={() => setOuverte(false)}
        titre={`Retirer /${nom}`}
        aide="Le fichier n'est pas effacé : il quitte commands/ pour un dossier retirees/ voisin, et la commande cesse de charger."
      >
        <form action={action} className="space-y-2">
          <input type="hidden" name="chemin" value={chemin} />
          <p className="overflow-x-auto rounded border border-line p-2 font-mono text-[10px] whitespace-nowrap text-muted">
            {chemin}
          </p>
          <button type="submit" disabled={enCours} className="btn-secondary w-full">
            {enCours ? "Écriture…" : `Confirmer le retrait de /${nom}`}
          </button>
          {retour.message && (
            <p role="alert" className="text-xs text-danger">
              {retour.message}
            </p>
          )}
        </form>
      </Modale>
    </>
  );
}

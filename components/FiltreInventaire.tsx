"use client";

import { Icone } from "@/components/icones";

/**
 * La barre de filtre de l'inventaire.
 *
 * Le champ n'a pas de bordure propre : c'est la boîte qui en porte une, pour
 * que l'icône de recherche vive à l'intérieur du contour plutôt qu'à côté.
 * L'anneau de focus se pose donc sur la boîte, pas sur l'entrée.
 */
export function FiltreInventaire({
  filtre,
  surFiltre,
  projetSeul,
  surProjetSeul,
}: {
  filtre: string;
  surFiltre: (valeur: string) => void;
  projetSeul: boolean;
  surProjetSeul: (valeur: boolean) => void;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-3.5">
      <div className="flex flex-1 items-center gap-2.5 rounded-[10px] border border-line-strong bg-surface px-3.5 py-[9px] focus-within:border-accent">
        <span className="text-muted">
          <Icone nom="chercher" taille={15} trait={1.8} />
        </span>
        <label className="flex-1">
          <span className="sr-only">Filtrer l&apos;inventaire</span>
          <input
            type="search"
            value={filtre}
            onChange={(e) => surFiltre(e.target.value)}
            placeholder="Filtrer par nom, description ou provenance…"
            className="w-full border-none bg-transparent p-0 text-corps text-ink outline-none placeholder:text-muted"
          />
        </label>
      </div>
      <label className="flex shrink-0 items-center gap-2 text-description text-ink-soft">
        <input
          type="checkbox"
          checked={projetSeul}
          onChange={(e) => surProjetSeul(e.target.checked)}
          className="size-[15px] accent-accent"
        />
        ce projet seulement
      </label>
    </div>
  );
}

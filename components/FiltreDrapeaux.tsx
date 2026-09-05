"use client";

import type { Drapeau } from "@/lib/lecture/drapeaux";

/**
 * Le filtre par drapeaux, au-dessus du plan — à choix multiple.
 *
 * Un workflow se tape avec plusieurs drapeaux à la fois : `--express --front`.
 * Chaque puce se bascule ; « aucun » remet tout à zéro. Le plan grise ce que
 * la combinaison saute et marque où elle s'arrête ; sous les puces, chaque
 * drapeau choisi dit ce qu'il change, puis le bilan de l'ensemble.
 */
export function FiltreDrapeaux({
  drapeaux,
  choisis,
  onBasculer,
  onVider,
  bilan,
}: {
  drapeaux: Drapeau[];
  choisis: string[];
  /** Ajoute ou retire un drapeau — le parent tient l'état, deux clics rapprochés ne s'écrasent pas. */
  onBasculer: (drapeau: string) => void;
  onVider: () => void;
  /** Le compte des étapes sautées et la fin, calculés sur la combinaison. */
  bilan: { sautees: number; fin: string | null };
}) {
  const actifs = drapeaux.filter((d) => choisis.includes(d.drapeau));

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Drapeaux du workflow">
        <span className="mr-1 font-mono text-meta text-muted">drapeaux</span>
        <Puce active={choisis.length === 0} onClic={onVider}>
          aucun
        </Puce>
        {drapeaux.map((d) => (
          <Puce key={d.drapeau} active={choisis.includes(d.drapeau)} onClic={() => onBasculer(d.drapeau)} titre={d.effet}>
            {d.drapeau}
          </Puce>
        ))}
      </div>
      {actifs.length > 0 && (
        <ul className="mt-2.5 flex max-w-[80ch] flex-col gap-1 text-description text-muted">
          {actifs.map((d) => (
            <li key={d.drapeau}>
              <span className="font-mono text-ink">{d.mode}</span> — {d.effet}
              {d.actives === null && <span className="font-mono text-meta"> · ne change rien à la séquence</span>}
            </li>
          ))}
          <li className="font-mono text-meta">
            {bilan.sautees === 0
              ? "aucune étape sautée"
              : `${bilan.sautees} étape${bilan.sautees > 1 ? "s" : ""} sautée${bilan.sautees > 1 ? "s" : ""}`}
            {bilan.fin ? `, fin à l'étape ${bilan.fin}` : ""}
          </li>
        </ul>
      )}
    </div>
  );
}

function Puce({
  active,
  onClic,
  titre,
  children,
}: {
  active: boolean;
  onClic: () => void;
  titre?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClic}
      title={titre}
      aria-pressed={active}
      className={`chip cursor-pointer transition-colors ${
        active ? "border-accent/40 bg-accent-wash text-ink" : "hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

"use client";

import type { Drapeau } from "@/lib/lecture/drapeaux";

/**
 * Le filtre par drapeau, au-dessus du plan.
 *
 * Choisir `--express` grise les étapes que ce mode saute et marque où il
 * s'arrête : le plan montre ce que le drapeau change, pas ce qu'il dit. Un
 * paramètre orthogonal se choisit aussi — il se dit alors pour ce qu'il est,
 * sans rien griser, plutôt que d'être absent et laisser croire qu'il n'existe pas.
 */
export function FiltreDrapeaux({
  drapeaux,
  total,
  choisi,
  onChoisir,
}: {
  drapeaux: Drapeau[];
  /** Le nombre d'étapes du tableau, pour compter les sautées. */
  total: number;
  choisi: string | null;
  onChoisir: (drapeau: string | null) => void;
}) {
  const actif = drapeaux.find((d) => d.drapeau === choisi);
  const sautees = actif?.actives ? total - actif.actives.length : 0;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Drapeaux du workflow">
        <span className="mr-1 font-mono text-meta text-muted">drapeau</span>
        <Puce active={choisi === null} onClic={() => onChoisir(null)}>
          aucun
        </Puce>
        {drapeaux.map((d) => (
          <Puce key={d.drapeau} active={choisi === d.drapeau} onClic={() => onChoisir(d.drapeau)} titre={d.effet}>
            {d.drapeau}
          </Puce>
        ))}
      </div>
      {actif && (
        <p className="mt-2.5 max-w-[80ch] text-description text-muted">
          <span className="font-mono text-ink">{actif.mode}</span> — {actif.effet}{" "}
          <span className="font-mono text-meta">
            {actif.actives === null
              ? "· ne change rien à la séquence"
              : `· ${sautees} étape${sautees > 1 ? "s" : ""} sautée${sautees > 1 ? "s" : ""}${
                  actif.finAnticipee ? `, fin à l'étape ${actif.finAnticipee}` : ""
                }`}
          </span>
        </p>
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

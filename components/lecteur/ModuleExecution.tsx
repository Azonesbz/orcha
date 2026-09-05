import { Icone } from "@/components/icones";

/**
 * Ce que le sous-agent a le droit de faire : son modèle, et ses outils.
 *
 * Les outils affichés sont ceux que le frontmatter déclare, et eux seuls.
 * Montrer aussi les outils *non* accordés supposerait de connaître la liste
 * complète des outils de Claude Code — elle n'est écrite nulle part sur le
 * disque, et la coder en dur ici afficherait une liste fausse dès la première
 * version qui en ajoute un. Orcha ne montre que ce qu'il a lu.
 */
export function ModuleExecution({
  modele,
  outils,
  proposes,
}: {
  modele: string;
  /** Les outils déclarés, tels qu'écrits. Vide veut dire : aucune restriction. */
  outils: string[];
  /** Ceux que la proposition ajouterait — jamais accordés avant Appliquer. */
  proposes: string[];
}) {
  return (
    <section className="card px-5 py-[18px]">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="text-accent">
          <Icone nom="reglages" taille={15} />
        </span>
        <span className="text-module font-semibold">Exécution</span>
        <span className="ml-auto font-mono text-[10.5px] text-faint">model · tools</span>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="w-56">
          <span className="text-note font-semibold text-muted">Modèle</span>
          <p className="mt-1.5 font-mono text-meta-lg">
            {modele || <span className="text-muted">hérité de la session</span>}
          </p>
        </div>
        <div className="min-w-[17.5rem] flex-1">
          <span className="text-note font-semibold">Outils autorisés</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {outils.map((outil) => (
              <Puce key={outil} nom={outil} />
            ))}
            {proposes.map((outil) => (
              <Puce key={outil} nom={outil} propose />
            ))}
            {outils.length === 0 && proposes.length === 0 && (
              <span className="font-mono text-meta text-muted">
                aucun `tools` déclaré — l&apos;agent hérite de tous les outils
              </span>
            )}
          </div>
          <p className="mt-2 text-meta-lg leading-[1.6] text-muted">
            {outils.length > 0
              ? "Tout outil non listé est refusé."
              : "Sans liste, rien n'est restreint : c'est un choix, pas un oubli."}
          </p>
        </div>
      </div>
    </section>
  );
}

function Puce({ nom, propose }: { nom: string; propose?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] font-mono text-meta ${
        propose
          ? "border border-dashed border-accent/60 bg-accent/5 text-accent-soft"
          : "border border-accent/40 text-accent"
      }`}
    >
      ✓ {nom}
      {propose && " · proposé"}
    </span>
  );
}

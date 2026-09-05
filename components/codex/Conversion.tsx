import { BoutonConvertir } from "@/components/codex/BoutonConvertir";
import type { Operation, PlanConversion, Statut } from "@/lib/ecriture/codex/plan";

/**
 * Le plan de conversion, montré avant d'être écrit.
 *
 * C'est la transformation la plus large de l'outil — un dossier entier — et
 * elle suit la règle des gestes qui enlèvent le plus : chaque ligne dit sa
 * source, sa destination et son sort, avant qu'un seul fichier ne bouge.
 * Rien n'est jamais écrasé : « déjà là » reste là.
 */
const STATUTS: Array<{ statut: Statut; teinte: string; sens: string }> = [
  { statut: "à écrire", teinte: "text-accent", sens: "sera créé au clic — jamais par-dessus un fichier existant" },
  { statut: "déjà là", teinte: "text-muted", sens: "la destination existe, ou Codex la lit déjà ailleurs : rien n'est touché" },
  { statut: "sans équivalent", teinte: "text-danger", sens: "Codex n'a pas cet objet : à refaire à la main, la note dit comment" },
];

export function Conversion({ plan }: { plan: PlanConversion }) {
  const compte = (statut: Statut) => plan.operations.filter((o) => o.statut === statut).length;

  return (
    <section className="card px-6 py-[22px]">
      <span className="text-module font-semibold">
        Convertir {plan.portee === "utilisateur" ? "le .claude personnel" : "le .claude du projet"}
      </span>
      <p className="mt-1.5 text-description text-muted">
        <span className="font-mono">{plan.source}</span> → <span className="font-mono">{plan.destination}</span>
      </p>

      {plan.operations.length === 0 ? (
        <p className="mt-3.5 text-corps text-muted">Rien à convertir : ce .claude est vide.</p>
      ) : (
        STATUTS.map(({ statut, teinte, sens }) => (
          <Groupe key={statut} statut={statut} teinte={teinte} sens={sens} operations={plan.operations.filter((o) => o.statut === statut)} />
        ))
      )}

      <BoutonConvertir portee={plan.portee} aEcrire={compte("à écrire")} />
    </section>
  );
}

function Groupe({ statut, teinte, sens, operations }: { statut: Statut; teinte: string; sens: string; operations: Operation[] }) {
  if (operations.length === 0) return null;
  return (
    <details className="mt-3.5 border-t border-line-faible pt-3" open={statut === "à écrire"}>
      <summary className="cursor-pointer text-corps">
        <span className={`font-mono font-semibold ${teinte}`}>{operations.length} {statut}</span>
        <span className="ml-2 text-description text-muted">{sens}</span>
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {operations.map((o, i) => (
          <li key={i} className="text-description">
            <span className="font-mono text-meta text-muted">{o.genre}</span>{" "}
            <span className="font-medium">{o.nom}</span>
            {o.destination && <span className="ml-2 font-mono text-meta text-muted">→ {o.destination}</span>}
            <p className="mt-0.5 text-note text-muted">{o.note}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

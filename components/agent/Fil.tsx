"use client";

import { useActionState } from "react";
import { Icone } from "@/components/icones";
import { annuler, type RetourAgent } from "@/app/(local)/actions-agent";

export interface Tour {
  qui: "moi" | "agent";
  texte: string;
  echec?: boolean;
  /** L'instantané pris avant ce tour, s'il a pu écrire. */
  instantane?: string;
  dossier?: string;
}

const VIERGE: RetourAgent = { etat: "vierge", texte: "", instantane: "", dossier: "", session: "" };

/**
 * Le fil de la discussion.
 *
 * Chaque tour de l'agent garde SON instantané : revenir en arrière depuis le
 * troisième tour ne doit pas défaire le premier. Le filet suit la conversation
 * plutôt que de n'en couvrir que la fin.
 */
export function Fil({
  tours,
  enCours,
  session,
}: {
  tours: Tour[];
  enCours: boolean;
  session: string;
}) {
  if (tours.length === 0 && !enCours) return null;

  return (
    <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto rounded-carte border border-line bg-paper p-4">
      {tours.map((tour, i) => (
        <Bulle key={i} tour={tour} session={session} />
      ))}
      {enCours && (
        <p className="flex items-center gap-2 font-mono text-meta text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          l&apos;agent lit et répond…
        </p>
      )}
    </div>
  );
}

function Bulle({ tour, session }: { tour: Tour; session: string }) {
  if (tour.qui === "moi") {
    return (
      <p className="self-end max-w-[80%] rounded-carte bg-accent-wash px-3.5 py-2.5 text-note whitespace-pre-wrap">
        {tour.texte}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded-carte border px-3.5 py-2.5 text-note leading-[1.7] whitespace-pre-wrap ${
          tour.echec ? "border-danger/30 bg-danger-wash text-danger" : "border-line-soft text-ink-soft"
        }`}
      >
        {tour.texte}
      </div>
      {tour.instantane && <Retour instantane={tour.instantane} dossier={tour.dossier ?? ""} session={session} />}
    </div>
  );
}

/** Le filet, puisque l'agent a écrit sans relecture préalable. */
function Retour({
  instantane,
  dossier,
  session,
}: {
  instantane: string;
  dossier: string;
  session: string;
}) {
  const [remis, action, enCours] = useActionState(annuler, VIERGE);
  if (remis.etat === "repondu") {
    return <p className="font-mono text-meta text-accent-soft">{remis.texte}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        formAction={action}
        name="instantane"
        value={instantane}
        disabled={enCours}
        className="btn-secondary min-h-0 px-3 py-1.5 text-description"
      >
        <Icone nom="retour" taille={13} />
        {enCours ? "restauration…" : "revenir à l'état d'avant ce tour"}
      </button>
      <input type="hidden" name="session" value={session} />
      <span className="font-mono text-meta text-muted">{dossier}</span>
      {remis.etat === "refuse" && (
        <span className="font-mono text-meta text-danger">{remis.texte}</span>
      )}
    </div>
  );
}

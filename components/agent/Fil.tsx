"use client";

import { useActionState } from "react";
import { Icone } from "@/components/icones";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
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
 * L'attente de l'agent ne s'y affiche pas : elle est annoncée au-dessus du
 * champ de saisie. Un « il réfléchit » posé dans le fil se lit comme un
 * message de plus, alors que ce n'est pas un tour de parole.
 *
 * Le défilement vient de `message-scroller` : il suit la réponse qui arrive,
 * garde un bout du tour précédent visible pour ne pas perdre le contexte, et
 * rend le bouton « descendre » dès qu'on remonte lire. Réimplémenter ça à la
 * main aurait été trois `useEffect` et autant de bugs de scroll.
 *
 * Chaque tour de l'agent garde SON instantané : revenir en arrière depuis le
 * troisième tour ne doit pas défaire le premier.
 */
export function Fil({ tours, session }: { tours: Tour[]; session: string }) {
  if (tours.length === 0) return <div className="min-h-0 flex-1" />;

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end" scrollPreviousItemPeek={24}>
      <MessageScroller className="min-h-0 flex-1 rounded-carte border border-line bg-paper">
        <MessageScrollerViewport className="p-4">
          <MessageScrollerContent className="gap-4">
            {tours.map((tour, i) => (
              <MessageScrollerItem key={i} messageId={String(i)} scrollAnchor={tour.qui === "moi"}>
                <Bulle tour={tour} session={session} />
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton className="absolute right-4 bottom-4" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function Bulle({ tour, session }: { tour: Tour; session: string }) {
  if (tour.qui === "moi") {
    return (
      <p className="ml-auto w-fit max-w-[80%] rounded-carte bg-accent-wash px-3.5 py-2.5 text-note whitespace-pre-wrap">
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
      {tour.instantane && (
        <Retour instantane={tour.instantane} dossier={tour.dossier ?? ""} session={session} />
      )}
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

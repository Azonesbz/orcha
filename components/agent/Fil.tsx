"use client";

import { Prose } from "@/components/agent/Prose";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
export interface Tour {
  qui: "moi" | "agent";
  texte: string;
  echec?: boolean;
  /** L'instantané pris avant ce tour, s'il a pu écrire. */
  instantane?: string;
  dossier?: string;
}

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
export function Fil({ tours }: { tours: Tour[] }) {
  if (tours.length === 0) return <div className="min-h-0 flex-1" />;

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end" scrollPreviousItemPeek={24}>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="py-2">
          <MessageScrollerContent className="gap-4">
            {tours.map((tour, i) => (
              <MessageScrollerItem key={i} messageId={String(i)} scrollAnchor={tour.qui === "moi"}>
                <Bulle tour={tour} />
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton className="absolute right-4 bottom-4" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function Bulle({ tour }: { tour: Tour }) {
  if (tour.qui === "moi") {
    return (
      <p className="ml-auto w-fit max-w-[80%] rounded-carte bg-accent-wash px-3.5 py-2.5 text-note whitespace-pre-wrap">
        {tour.texte}
      </p>
    );
  }

  // Pas de bulle autour d'une réponse : le fil a déjà son cadre, et une boîte
  // dans une boîte alourdit la lecture. Seuls parlent en encadré celui qui
  // écrit — bulle teintée — et l'échec, qui doit se voir.
  return (
    <div className="flex flex-col gap-2">
      {tour.echec ? (
        <div className="rounded-carte border border-danger/30 bg-danger-wash px-3.5 py-2.5 text-note leading-[1.7] whitespace-pre-wrap text-danger">
          {tour.texte}
        </div>
      ) : (
        <Prose>{tour.texte}</Prose>
      )}
    </div>
  );
}

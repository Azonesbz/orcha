"use client";

import { motion, MotionConfig } from "motion/react";
import { Prose } from "@/components/agent/Prose";
import { Piste } from "@/components/agent/Gestes";
import { useMotAMot } from "@/components/agent/motAMot";
import type { Tour } from "@/lib/agent/tour";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

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
 * Chaque tour de l'agent garde SA piste — ce qu'il a lu, lancé et réécrit pour
 * répondre. Elle s'affiche pendant le travail et se replie une fois la réponse
 * là : c'est la preuve, pas la réponse.
 *
 * Un tour entre en fondu en un quart de seconde, seize pixels plus bas que sa
 * place : assez pour que l'œil voie d'où il arrive, pas assez pour retarder
 * la lecture. Une durée fixe plutôt que le ressort par défaut de motion : un
 * ressort sur seize pixels se pose en un clin d'œil et passe inaperçu. Sous
 * « réduire les animations », la translation part et le fondu reste — comme
 * le fait déjà globals.css pour les animations CSS.
 */

/* `motion.create` garde le composant du scroller tel quel et lui ajoute les
   propriétés d'animation : l'ancre de défilement et l'entrée en fondu vivent
   sur le même nœud, sans div intermédiaire qui fausserait la mesure. */
const MotionMessageScrollerItem = motion.create(MessageScrollerItem);

export function Fil({ tours, enCours }: { tours: Tour[]; enCours: boolean }) {
  if (tours.length === 0) return <div className="min-h-0 flex-1" />;

  return (
    <MotionConfig reducedMotion="user">
      <MessageScrollerProvider autoScroll defaultScrollPosition="end" scrollPreviousItemPeek={24}>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="py-2">
            <MessageScrollerContent className="gap-4">
              {tours.map((tour, i) => (
                <MotionMessageScrollerItem
                  key={i}
                  messageId={String(i)}
                  scrollAnchor={tour.qui === "moi"}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Bulle tour={tour} enCours={enCours && i === tours.length - 1} />
                </MotionMessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="absolute right-4 bottom-4" />
        </MessageScroller>
      </MessageScrollerProvider>
    </MotionConfig>
  );
}

function Bulle({ tour, enCours }: { tour: Tour; enCours: boolean }) {
  // Les paquets du CLI se déroulent mot à mot ; un tour relu s'affiche entier.
  const reponse = tour.texte || tour.brouillon || "";
  const affiche = useMotAMot(reponse, enCours);

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
  //
  // Le tour de l'agent existe dès l'envoi — il porte la piste des gestes. La
  // réponse, elle, s'écrit dessous fragment après fragment (le brouillon),
  // puis se pose une fois le résultat tombé : même texte, même bloc, aucun
  // saut. Le bloc ne se monte qu'avec son premier mot, et joue sa propre
  // entrée : celle de l'item a déjà eu lieu, sur un tour encore vide.
  return (
    <div className="flex flex-col gap-2">
      <Piste gestes={tour.gestes ?? []} enCours={enCours} />
      {reponse !== "" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {tour.echec ? (
            <div className="rounded-carte border border-danger/30 bg-danger-wash px-3.5 py-2.5 text-note leading-[1.7] whitespace-pre-wrap text-danger">
              {affiche}
            </div>
          ) : (
            <Prose>{affiche}</Prose>
          )}
        </motion.div>
      )}
    </div>
  );
}

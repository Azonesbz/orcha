"use client";

import { useEffect, useRef } from "react";

/**
 * Une modale sur `<dialog>` natif.
 *
 * `showModal()` apporte gratuitement ce qu'une div réimplémenterait mal : le
 * piège de focus, la fermeture à l'échappement, l'inertie du reste de la page
 * pour les lecteurs d'écran, et un fond stylable par `::backdrop`.
 */
export function Modale({
  ouverte,
  titre,
  aide,
  onFermer,
  large,
  children,
}: {
  ouverte: boolean;
  titre: string;
  aide: string;
  onFermer: () => void;
  /** Une conversation ne tient pas dans la largeur d'un formulaire. */
  large?: boolean;
  children: React.ReactNode;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const noeud = dialogue.current;
    if (!noeud) return;
    if (ouverte && !noeud.open) noeud.showModal();
    if (!ouverte && noeud.open) noeud.close();
  }, [ouverte]);

  return (
    <dialog
      ref={dialogue}
      aria-label={titre}
      onClose={onFermer}
      /* Le clic sur le fond ferme : la cible de l'événement est alors le
         <dialog> lui-même, jamais un de ses enfants. */
      onClick={(e) => {
        if (e.target === dialogue.current) onFermer();
      }}
      /* `inset-0` + `m-auto` + `h-fit` : la préflight de Tailwind supprime la
         marge automatique que l'agent utilisateur pose sur un dialogue modal,
         et il retombait en bas de l'écran. */
      className={`card fixed inset-0 m-auto h-fit max-h-[calc(100vh-4rem)] overflow-y-auto p-0 text-ink ${
        large ? "w-[min(46rem,calc(100vw-2rem))]" : "w-[min(32rem,calc(100vw-2rem))]"
      }`}
    >
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-section font-semibold">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="btn-ghost min-h-0 px-2 py-1 text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-description text-muted">{aide}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}

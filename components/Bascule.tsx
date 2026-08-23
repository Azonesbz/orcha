"use client";

/**
 * L'interrupteur de la charte : une pastille de 34 × 20, le bouton à 14.
 *
 * La case reste une vraie case à cocher, seulement masquée : un interrupteur
 * dessiné en `div` ne se coche pas au clavier et n'existe pas pour un lecteur
 * d'écran. Le `peer` de Tailwind fait le reste, et l'anneau de focus se pose
 * sur la pastille faute de pouvoir se poser sur l'entrée.
 */
export function Bascule({
  active,
  surChangement,
  children,
}: {
  active: boolean;
  surChangement: (valeur: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-5 flex w-fit cursor-pointer items-center gap-2.5 text-corps text-ink-soft">
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => surChangement(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative inline-block h-5 w-[34px] shrink-0 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
          active ? "bg-accent" : "bg-line-strong"
        }`}
      >
        <span
          className={`absolute top-[3px] size-3.5 rounded-full transition-all ${
            active ? "right-[3px] bg-paper" : "left-[3px] bg-ink"
          }`}
        />
      </span>
      <span>{children}</span>
    </label>
  );
}

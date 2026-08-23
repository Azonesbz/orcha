import type { ReactNode } from "react";

/**
 * La convention d'affichage des trous — bruyante, et c'est le but.
 *
 * Un emplacement vide rendu sobrement finit en production : il ressemble trop
 * à du contenu pour qu'on le voie à la relecture. Celui-ci se signale — filet
 * pointillé, mot « à remplir » en ambre — et ne comble jamais le manque par
 * une valeur plausible, qui serait un mensonge inspectable en trente secondes.
 *
 * L'ambre alerte mais ne porte pas l'information seule : le mot est écrit, pour
 * qui ne distingue pas la couleur. Et le pointillé n'existe que pour cet usage
 * dans toute la page — un filet continu dirait « c'est fini ».
 */

export function ARemplir({ quoi, children }: { quoi: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-5">
      <p className="surtitre text-accent-soft">À remplir — {quoi}</p>
      <div className="mt-2 space-y-3 text-sm text-muted">{children}</div>
    </div>
  );
}

/** Un champ nommé mais vide : l'intitulé tient sa place, la valeur dit qu'elle manque. */
export function ChampARemplir({ intitule }: { intitule: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-ink-soft">{intitule}</span>
      <span className="rounded-md border border-dashed border-line-strong px-2 py-0.5 font-mono text-xs text-accent-soft">
        à remplir
      </span>
    </p>
  );
}

import type { Route } from "next";
import Link from "next/link";
import { Icone } from "@/components/icones";
import { Pastille } from "@/components/primitives";
import type { Portee } from "@/lib/types";

/**
 * L'en-tête d'un écran qui parle d'un fichier précis.
 *
 * Le nom s'écrit en mono : c'est un nom de dossier sur le disque, pas un titre
 * de prose. La pastille de portée l'accompagne toujours — savoir *quel*
 * fichier on regarde sans savoir d'où il vient ne sert à rien.
 */
export function RetourListe({ href, libelle }: { href: Route; libelle: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-[7px] font-mono text-meta-lg text-muted hover:text-ink"
    >
      <Icone nom="retour" taille={13} />
      {libelle}
    </Link>
  );
}

export function EnteteFichier({
  nom,
  portee,
  origine,
  children,
  action,
}: {
  nom: string;
  portee: Portee;
  origine: string;
  /** Ce qui se dit sous le titre : le chemin, ou le décompte des étapes. */
  children: React.ReactNode;
  /** Une seule action, alignée à droite du titre. */
  action?: React.ReactNode;
}) {
  return (
    <header className="mt-[18px] mb-8 flex flex-wrap items-end gap-4">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-baseline gap-3 text-ecran font-semibold tracking-[-0.01em]">
          <span className="font-mono font-medium">{nom}</span>
          <Pastille portee={portee} origine={origine} />
        </h1>
        {children}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  );
}

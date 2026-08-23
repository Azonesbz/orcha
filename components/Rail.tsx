"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomIcone } from "@/components/icones";
import { Logo } from "@/components/Logo";

/**
 * La navigation de l'application.
 *
 * Rail vertical à partir de `md`, barre horizontale en dessous. Ce n'est pas
 * un site : le chrome ne défile pas, seule la zone de contenu bouge. C'est
 * aussi ce qui survivra à un empaquetage en logiciel, là où une colonne
 * centrée à grandes marges ne survivrait pas.
 *
 * La sélection est un lavis de Citron à 8 %, jamais un aplat : la charte
 * réserve les aplats au bouton primaire.
 */
const ENTREES: ReadonlyArray<{ href: Route; libelle: string; icone: NomIcone }> = [
  { href: "/", libelle: "Vue d'ensemble", icone: "vue-d-ensemble" },
  { href: "/competences", libelle: "Compétences", icone: "competences" },
  { href: "/workflows", libelle: "Workflows", icone: "workflows" },
  { href: "/agents", libelle: "Agents", icone: "agents" },
  { href: "/reglages", libelle: "Réglages", icone: "reglages" },
  { href: "/veille", libelle: "Veille", icone: "veille" },
];

function estActif(chemin: string, href: string): boolean {
  return href === "/" ? chemin === "/" : chemin.startsWith(href);
}

export function Rail({ pied }: { pied: string }) {
  const chemin = usePathname();

  return (
    <>
      {/* Rail : la navigation d'une application de bureau. */}
      <nav
        aria-label="Sections"
        className="hidden w-60 shrink-0 flex-col gap-0.5 border-r border-line bg-surface/60 px-3.5 py-5 md:flex"
      >
        <Link href="/" className="mb-6 px-2.5">
          <Logo />
        </Link>
        {ENTREES.map((e) => (
          <Entree key={e.href} {...e} actif={estActif(chemin, e.href)} />
        ))}
        <p className="mt-auto flex items-center gap-1.5 p-2.5 font-mono text-[10.5px] text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          {pied}
        </p>
      </nav>

      {/* En fenêtre étroite, le rail se couche. Le pied disparaît : l'adresse
          n'est pas ce qu'on vient chercher sur un écran de cette largeur. */}
      <nav
        aria-label="Sections"
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface/60 px-3 py-2 md:hidden"
      >
        <Link href="/" className="mr-2 shrink-0">
          <Logo taille={18} />
        </Link>
        {ENTREES.map((e) => (
          <Entree key={e.href} {...e} actif={estActif(chemin, e.href)} couche />
        ))}
      </nav>
    </>
  );
}

function Entree({
  href,
  libelle,
  icone,
  actif,
  couche,
}: {
  href: Route;
  libelle: string;
  icone: NomIcone;
  actif: boolean;
  couche?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-controle px-2.5 py-[9px] transition-colors ${
        couche ? "text-meta-lg whitespace-nowrap" : "text-corps"
      } ${
        actif
          ? "bg-accent-wash font-semibold text-ink"
          : "text-muted hover:bg-accent-wash hover:text-ink"
      }`}
    >
      {/* L'icône hérite de l'encre du texte ; seule l'entrée active la passe en
          Citron, et c'est le seul endroit du rail où la couleur parle. */}
      <span className={actif ? "text-accent" : undefined}>
        <Icone nom={icone} taille={16} />
      </span>
      {libelle}
    </Link>
  );
}

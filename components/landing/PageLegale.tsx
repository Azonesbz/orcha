import Link from "next/link";
import type { ReactNode } from "react";
import { EnteteService } from "@/components/EnteteService";

/**
 * La coquille des pages légales.
 *
 * Volontairement sobre et sans appel à l'action : on ne vend pas dans des
 * conditions de vente. Le lecteur y vient pour vérifier quelque chose, il doit
 * le trouver vite et repartir.
 */
export function PageLegale({
  titre,
  miseAJour,
  children,
}: {
  titre: string;
  miseAJour: string;
  children: ReactNode;
}) {
  return (
    <main>
      <EnteteService />

      <article className="max-w-prose">
        <h1 className="text-ecran font-semibold tracking-[-0.01em]">{titre}</h1>
        <p className="mt-2 text-xs text-muted">Dernière mise à jour : {miseAJour}</p>

        <div className="mt-8 space-y-6 text-sm text-ink-soft">{children}</div>

        <nav className="mt-12 flex flex-wrap gap-4 border-t border-line pt-6 text-xs text-muted">
          <Link href="/produit" className="underline underline-offset-4">
            Orcha
          </Link>
          <Link href="/mentions" className="underline underline-offset-4">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="underline underline-offset-4">
            Confidentialité
          </Link>
        </nav>
      </article>
    </main>
  );
}

/** Un titre de section, et son contenu. */
export function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink">{titre}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

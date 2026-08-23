import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * L'en-tête des pages publiques.
 *
 * Plus de contrôles de compte : le produit est libre, il n'y a personne à
 * connecter. Ce qui reste est un lien vers le dépôt, qui est ce que cherche un
 * lecteur arrivé ici.
 */
export function EnteteService() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <Link href="/produit">
        <Logo />
      </Link>

      <a
        href="https://github.com/Azonesbz/orcha"
        className="btn-ghost"
        rel="noreferrer noopener"
      >
        Le code
      </a>
    </header>
  );
}

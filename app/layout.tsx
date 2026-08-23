import type { Metadata } from "next";
import { Bricolage_Grotesque, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

/* Deux familles, une règle : ce qui existe sur le disque s'écrit en mono —
   noms, chemins, comptes. La prose explique en Bricolage ; le mono atteste. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const spline = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono-family",
});

export const metadata: Metadata = {
  title: "Orcha",
  description: "Voir et modifier un dossier .claude",
};

/**
 * La coquille de l'application.
 *
 * Elle ne fait que le strict minimum commun aux deux rôles : la langue et les
 * polices. La mise en page appartient aux coquilles — `(local)` pour
 * l'application, `(service)` pour ce qui est public. Elles ne veulent pas la
 * même chose, et les mélanger ici imposerait le chrome fixe d'un logiciel à
 * une page qui doit défiler.
 */
export default function Racine({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${spline.variable}`}>
      {/* Ni hauteur ni débordement ici : l'application locale veut un chrome
          fixe, la page publique le défilement naturel du document. Chaque
          coquille pose le sien. */}
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

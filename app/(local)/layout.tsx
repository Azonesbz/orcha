import { notFound } from "next/navigation";
import { Rail } from "@/components/Rail";
import { estPublic } from "@/lib/acces/role";
import { piedDeRail } from "@/lib/chrome/pied";

/**
 * La coquille de l'application locale.
 *
 * Ce n'est pas un site : `h-dvh` et `overflow-hidden` au corps, une seule zone
 * qui défile, le chrome fixe. La colonne centrée à grandes marges d'un site
 * gaspillerait la fenêtre — et ne survivrait pas à un empaquetage en logiciel,
 * où l'application occupe ce qu'on lui donne.
 *
 * Le rail vit ici et non à la racine : les pages du service sont publiques, et
 * « Compétences » ou « Workflows » n'y veulent rien dire.
 */
export default function CoquilleLocale({ children }: { children: React.ReactNode }) {
  // Sur le déploiement public, l'application locale n'existe pas : elle lit et
  // écrit un dossier `.claude`, qui serait ici celui du serveur.
  if (estPublic()) notFound();

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <Rail pied={piedDeRail()} />
      <div className="relative min-w-0 flex-1 overflow-y-auto">
        <div aria-hidden className="fond-grille" />
        {/* Une application occupe ce qu'on lui donne. La borne haute évite
            seulement les lignes à rallonge sur un très grand écran. */}
        <div className="relative z-10 mx-auto max-w-[100rem] px-6 py-8 sm:px-12 sm:py-11">
          {children}
        </div>
      </div>
    </div>
  );
}

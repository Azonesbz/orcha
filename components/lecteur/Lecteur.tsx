import { decouperCorps } from "@/lib/modules/decoupe";
import { ApercuFichier } from "./ApercuFichier";
import { ModuleFichier } from "./ModuleFichier";

export interface Fichier {
  /** Le corps seul, découpé en modules. */
  corps: string;
  /** Le frontmatter, délimiteurs compris — montré dans l'aperçu, jamais interprété ici. */
  entete: string;
  nomFichier: string;
}

/**
 * Le fichier en modules, en lecture.
 *
 * Rien ne se modifie à la main ici, et plus rien par proposition non plus : il
 * y avait un panneau « Modifier avec Claude », c'est l'agent du tiroir qui a
 * pris sa place — il connaît l'écran d'où on l'appelle, écrit directement, et
 * montre chaque geste. Ce que cette vue fait, c'est rendre le fichier lisible —
 * une liste numérotée se lit comme une liste — et montrer à côté ce qui est
 * réellement sur le disque, frontmatter compris.
 */
export function Lecteur({ fichier, modulesFixes }: { fichier: Fichier; modulesFixes: React.ReactNode }) {
  const modules = decouperCorps(fichier.corps);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-[26rem] flex-1 flex-col gap-3.5">
        {modulesFixes}
        {modules.map((module) => (
          <ModuleFichier key={module.cle} module={module} />
        ))}
      </div>

      <aside className="flex w-100 shrink-0 flex-col gap-3.5">
        <ApercuFichier nomFichier={fichier.nomFichier} texte={fichier.entete + fichier.corps} />
      </aside>
    </div>
  );
}

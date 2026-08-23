import { Icone, type NomIcone } from "@/components/icones";

/**
 * Le module d'identité : ce que le frontmatter déclare.
 *
 * Il ne vient pas du découpage du corps — il est lu du frontmatter, que
 * `remplacerCorps` ne touche jamais. C'est pourquoi il porte sa propre carte
 * plutôt que d'être un module comme les autres.
 */
export function ModuleIdentite({
  icone,
  description,
  indiceArgument,
}: {
  icone: NomIcone;
  description: string;
  indiceArgument?: string;
}) {
  return (
    <section className="card px-5 py-[18px]">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="text-accent">
          <Icone nom={icone} taille={15} />
        </span>
        <span className="text-module font-semibold">Identité</span>
        <span className="ml-auto font-mono text-[10.5px] text-faint">--- frontmatter</span>
      </div>
      <div className="flex flex-col gap-2.5">
        <Ligne etiquette="Description">
          <p className="mt-1 text-corps">{description || "— aucune —"}</p>
        </Ligne>
        {indiceArgument !== undefined && (
          <Ligne etiquette="Indice d'argument">
            <p className="mt-1 font-mono text-meta-lg text-accent-soft">
              {indiceArgument || "— aucun —"}
            </p>
          </Ligne>
        )}
      </div>
    </section>
  );
}

function Ligne({ etiquette, children }: { etiquette: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-note font-semibold text-muted">{etiquette}</span>
      {children}
    </div>
  );
}

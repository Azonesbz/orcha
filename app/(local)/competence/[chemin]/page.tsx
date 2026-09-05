import { notFound } from "next/navigation";
import { Lecteur } from "@/components/lecteur/Lecteur";
import { ModuleIdentite } from "@/components/lecteur/ModuleIdentite";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { retourDepuis } from "@/lib/chrome/retour";
import { Silences } from "@/components/primitives";
import { lireAtelier } from "@/lib/lecture/atelier";
import { lireTexte } from "@/lib/lecture/fichiers";

export const dynamic = "force-dynamic";

export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ chemin: string }>;
  searchParams: Promise<{ retour?: string }>;
}) {
  const { chemin } = await params;
  const { retour } = await searchParams;
  const cible = decodeURIComponent(chemin);
  const competence = lireAtelier().competences.find((c) => c.chemin === cible);
  if (!competence) notFound();

  const nombreDeModules = 1 + (competence.corps.match(/^##\s+/gm)?.length ?? 0);

  return (
    <main>
      <RetourListe {...retourDepuis(retour, { href: "/competences", libelle: "toutes les compétences" })} />

      <EnteteFichier
        nom={competence.nom}
        portee={competence.portee}
        origine={competence.origine}
      >
        <p className="mt-2 font-mono text-meta-lg text-muted">
          {competence.chemin} · {nombreDeModules} modules
        </p>
      </EnteteFichier>

      <Silences silences={competence.silences} />

      <Lecteur
        fichier={{
          corps: competence.corps,
          entete: entete(competence.chemin, competence.corps),
          nomFichier: "SKILL.md",
        }}
        modulesFixes={
          <ModuleIdentite
            icone="competences"
            description={competence.description}
            indiceArgument={competence.indiceArgument}
          />
        }
      />
    </main>
  );
}

/**
 * Le frontmatter, délimiteurs compris — pris par différence.
 *
 * La lecture rend le corps comme la fin exacte du fichier (`brut.slice`) :
 * l'en-tête est donc tout ce qui précède, au caractère près. Le reconstruire
 * en re-sérialisant le YAML détruirait les lignes que YAML strict refuse et
 * que Claude Code lit très bien.
 */
function entete(chemin: string, corps: string): string {
  const brut = lireTexte(chemin);
  return brut === null ? "" : brut.slice(0, brut.length - corps.length);
}

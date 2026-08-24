import { notFound } from "next/navigation";
import { agir } from "./actions";
import { Editeur } from "@/components/editeur/Editeur";
import { ModuleIdentite } from "@/components/editeur/ModuleIdentite";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { retourDepuis } from "@/lib/chrome/retour";
import { Silences } from "@/components/primitives";
import { verifierChemin } from "@/lib/ecriture/competence";
import { ecritureOuverte } from "@/lib/acces/etat";
import { lireAtelier } from "@/lib/lecture/atelier";
import { lireTexte } from "@/lib/lecture/fichiers";
import { cliDisponible } from "@/lib/claude/proposition";
import { lireConfig } from "@/lib/reglages/config";

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

  const refus = (await ecritureOuverte())
    ? raisonDuRefus(cible)
    : "L'écriture est fermée sur ce déploiement. La lecture reste entière.";
  const config = lireConfig();
  const nombreDeModules = 1 + (competence.corps.match(/^##\s+/gm)?.length ?? 0);

  return (
    <main>
      <RetourListe {...retourDepuis(retour, { href: "/competences", libelle: "toutes les compétences" })} />

      <EnteteFichier
        nom={competence.nom}
        portee={competence.portee}
        origine={competence.origine}
        action={
          <span className="font-mono text-meta text-muted">
            lecture seule — toute écriture passe par Claude
          </span>
        }
      >
        <p className="mt-2 font-mono text-meta-lg text-muted">
          {competence.chemin} · {nombreDeModules} modules
        </p>
      </EnteteFichier>

      <Silences silences={competence.silences} />

      <Editeur
        fichier={{
          chemin: competence.chemin,
          nom: competence.nom,
          corps: competence.corps,
          entete: entete(competence.chemin, competence.corps),
          nomFichier: "SKILL.md",
        }}
        action={agir}
        modulesFixes={
          <ModuleIdentite
            icone="competences"
            description={competence.description}
            indiceArgument={competence.indiceArgument}
          />
        }
        modele={config.modele}
        cleConfiguree={config.cleApi !== "" || cliDisponible()}
        refus={refus}
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

/** Chaîne vide si le fichier est modifiable, sinon la raison, en clair. */
function raisonDuRefus(chemin: string): string {
  try {
    verifierChemin(chemin);
    return "";
  } catch (erreur) {
    return erreur instanceof Error ? erreur.message : "Non modifiable.";
  }
}

import type { Route } from "next";
import { notFound } from "next/navigation";
import { Lecteur } from "@/components/lecteur/Lecteur";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { Silences } from "@/components/primitives";
import { retourDepuis } from "@/lib/chrome/retour";
import { lireAtelier } from "@/lib/lecture/atelier";
import { lireTexte } from "@/lib/lecture/fichiers";
import { lireWorkflow } from "@/lib/lecture/workflow";
import type { Competence } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Etape({
  params,
  searchParams,
}: {
  params: Promise<{ chemin: string }>;
  searchParams: Promise<{ retour?: string }>;
}) {
  const cible = decodeURIComponent((await params).chemin);
  const { retour } = await searchParams;

  const contenu = lireTexte(cible);
  if (contenu === null) notFound();

  const atelier = lireAtelier();
  const proprietaire = competenceProprietaire(atelier.competences, cible);
  if (!proprietaire) notFound();

  const laquelle = etapeDans(atelier, proprietaire, cible);

  return (
    <main>
      <RetourListe
        {...retourDepuis(retour, {
          href: `/competence/${encodeURIComponent(proprietaire.chemin)}` as Route,
          libelle: `retour à ${proprietaire.nom}`,
        })}
      />

      <EnteteFichier
        nom={nomDuFichier(cible)}
        portee={proprietaire.portee}
        origine={proprietaire.origine}
      >
        <p className="mt-2.5 text-intro text-muted">
          {laquelle ? `Étape ${laquelle.numero} de ${proprietaire.nom} — ${laquelle.role}` : `Fichier de ${proprietaire.nom}`}
        </p>
        <p className="mt-1.5 font-mono text-meta-lg text-muted">{cible}</p>
      </EnteteFichier>

      {laquelle && <Silences silences={laquelle.silences} />}

      <Lecteur
        // Une étape n'a pas de frontmatter : le corps EST le fichier.
        fichier={{ corps: contenu, entete: "", nomFichier: nomDuFichier(cible) }}
        modulesFixes={null}
      />
    </main>
  );
}

/** La compétence dont le dossier contient ce fichier. */
function competenceProprietaire(competences: Competence[], chemin: string): Competence | undefined {
  return competences
    .filter((c) => chemin.startsWith(`${dossierDe(c.chemin)}/`))
    .sort((a, b) => b.chemin.length - a.chemin.length)[0];
}

/** L'étape du workflow qui déclare ce fichier, si elle existe. */
function etapeDans(
  atelier: ReturnType<typeof lireAtelier>,
  competence: Competence,
  chemin: string,
) {
  const workflow = lireWorkflow(competence.chemin, competence.corps, {
    agents: atelier.agents.map((a) => a.nom),
    competences: atelier.competences.map((c) => c.nom),
  });
  return workflow?.etapes.find((e) => e.cheminAbsolu === chemin);
}

function dossierDe(chemin: string): string {
  return chemin.slice(0, chemin.lastIndexOf("/"));
}

function nomDuFichier(chemin: string): string {
  return chemin.slice(chemin.lastIndexOf("/") + 1);
}

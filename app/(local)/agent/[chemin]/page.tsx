import { notFound } from "next/navigation";
import { Lecteur } from "@/components/lecteur/Lecteur";
import { ModuleExecution } from "@/components/lecteur/ModuleExecution";
import { ModuleIdentite } from "@/components/lecteur/ModuleIdentite";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { retourDepuis } from "@/lib/chrome/retour";
import { Silences } from "@/components/primitives";
import { lireAtelier } from "@/lib/lecture/atelier";
import { MODELE_DE_SESSION, OUTILS_HERITES } from "@/lib/lecture/documents";
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
  const agent = lireAtelier().agents.find((a) => a.chemin === cible);
  if (!agent) notFound();

  const modules = 2 + (agent.corps.match(/^##\s+/gm)?.length ?? 0);

  return (
    <main>
      <RetourListe {...retourDepuis(retour, { href: "/agents", libelle: "tous les agents" })} />

      <EnteteFichier
        nom={agent.nom}
        portee={agent.portee}
        origine={agent.origine}
      >
        <p className="mt-2 font-mono text-meta-lg text-muted">
          {agent.chemin} · {modules} modules
        </p>
      </EnteteFichier>

      <Silences silences={agent.silences} />

      <Lecteur
        fichier={{
          corps: agent.corps,
          entete: entete(agent.chemin, agent.corps),
          nomFichier: nomDuFichier(agent.chemin),
        }}
        modulesFixes={
          <>
            <ModuleIdentite icone="agents" description={agent.description} />
            <ModuleExecution
              modele={agent.modele === MODELE_DE_SESSION ? "" : agent.modele}
              outils={enListe(agent.outils)}
              proposes={[]}
            />
          </>
        }
      />
    </main>
  );
}

/**
 * `tools: Read, Grep` — une liste séparée par des virgules, rien de plus.
 *
 * La lecture remplace un `tools` absent par une phrase : elle ne doit surtout
 * pas ressortir en pastille, ce serait afficher un outil qui n'existe pas.
 */
function enListe(outils: string): string[] {
  if (outils === OUTILS_HERITES) return [];
  return outils
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o !== "");
}

/**
 * Le frontmatter, délimiteurs compris — pris par différence.
 *
 * La lecture rend le corps comme la fin exacte du fichier : l'en-tête est donc
 * tout ce qui précède, au caractère près. Le reconstruire en re-sérialisant le
 * YAML détruirait les lignes que YAML strict refuse.
 */
function entete(chemin: string, corps: string): string {
  const brut = lireTexte(chemin);
  return brut === null ? "" : brut.slice(0, brut.length - corps.length);
}

function nomDuFichier(chemin: string): string {
  return chemin.slice(chemin.lastIndexOf("/") + 1);
}

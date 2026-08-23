import Link from "next/link";
import { EnteteEcran } from "@/components/EnteteEcran";
import { Entree, Liste, Panneau, Pastille } from "@/components/primitives";
import { lireAtelier } from "@/lib/lecture/atelier";
import { lireWorkflow } from "@/lib/lecture/workflow";

export const dynamic = "force-dynamic";

/**
 * Les workflows, enfin réunis.
 *
 * Ils n'étaient trouvables qu'en parcourant les trente-cinq compétences à la
 * recherche d'une étiquette. Ils ont pourtant leur propre grammaire — des
 * étapes, un point de départ, des arrêts durs — et méritaient leur page.
 */
export default function Page() {
  const atelier = lireAtelier();
  const resolveur = {
    agents: atelier.agents.map((a) => a.nom),
    competences: atelier.competences.map((c) => c.nom),
  };

  const workflows = atelier.competences
    .map((c) => ({ competence: c, workflow: lireWorkflow(c.chemin, c.corps, resolveur) }))
    .filter((x): x is { competence: (typeof atelier.competences)[number]; workflow: NonNullable<ReturnType<typeof lireWorkflow>> } => x.workflow !== null);

  return (
    <main>
      <EnteteEcran
        surtitre="plans"
        titre="Workflows"
        intro="Les compétences qui se déroulent en étapes numérotées. Une étape déclarée dont le fichier manque ne s'exécutera jamais, et rien d'autre ne le dit."
      />

      <Panneau
        titre="Workflows"
        compte={workflows.length}
        vide="Aucune compétence ne déclare de tableau d'étapes ici."
      >
        <Liste>
          {workflows.map(({ competence, workflow }) => {
            const manquantes = workflow.etapes.filter((e) => !e.present).length;
            const arrets = workflow.etapes.filter((e) => e.arretDur).length;
            return (
              <Entree
                key={competence.chemin}
                description={competence.description}
                titre={
                  <>
                    <Link
                      href={`/workflow/${encodeURIComponent(competence.chemin)}`}
                      className="font-medium underline decoration-line underline-offset-4 hover:decoration-ink"
                    >
                      {competence.nom}
                    </Link>
                    <Pastille portee={competence.portee} origine={competence.origine} />
                    <span className="font-mono text-meta text-muted">
                      {workflow.etapes.length} étapes · {arrets} arrêt{arrets > 1 ? "s" : ""} dur
                      {arrets > 1 ? "s" : ""}
                    </span>
                    {manquantes > 0 && (
                      <span className="font-mono text-meta text-danger">
                        {manquantes} fichier{manquantes > 1 ? "s" : ""} manquant
                        {manquantes > 1 ? "s" : ""}
                      </span>
                    )}
                    {workflow.orphelins.length > 0 && (
                      <span className="font-mono text-meta text-danger">
                        {workflow.orphelins.length} hors séquence
                      </span>
                    )}
                  </>
                }
              />
            );
          })}
        </Liste>
      </Panneau>
    </main>
  );
}

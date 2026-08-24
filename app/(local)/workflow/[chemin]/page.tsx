import Link from "next/link";
import { Icone } from "@/components/icones";
import { versLEditeur } from "@/lib/chrome/retour";
import { notFound } from "next/navigation";
import { PlanWorkflow } from "@/components/PlanWorkflow";
import { AtelierWorkflow } from "./Atelier";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { verifierChemin } from "@/lib/ecriture/competence";
import { EcritureRefusee } from "@/lib/ecriture/garde";
import { ecritureOuverte } from "@/lib/acces/etat";
import { lireAtelier } from "@/lib/lecture/atelier";
import { lireWorkflow } from "@/lib/lecture/workflow";

export const dynamic = "force-dynamic";

export default async function VueWorkflow({ params }: { params: Promise<{ chemin: string }> }) {
  const { chemin } = await params;
  const cible = decodeURIComponent(chemin);

  const atelier = lireAtelier();
  const competence = atelier.competences.find((c) => c.chemin === cible);
  if (!competence) notFound();

  const workflow = lireWorkflow(competence.chemin, competence.corps, {
    agents: atelier.agents.map((a) => a.nom),
    competences: atelier.competences.map((c) => c.nom),
  });
  if (!workflow) notFound();

  const manquantes = workflow.etapes.filter((e) => !e.present).length;
  const arrets = workflow.etapes.filter((e) => e.arretDur).length;
  const refus = (await ecritureOuverte())
    ? raisonDuRefus(competence.chemin)
    : "L'écriture demande un compte et un achat — la lecture reste entière. Voir la page Compte.";
  // Un trou dans la numérotation : 00, 01, 03 — l'étape 02 a été retirée.
  const numerotationATrou = workflow.etapes.some((e, i) => Number(e.numero) !== i);

  return (
    <main>
      <RetourListe href="/competences" libelle="toutes les compétences" />

      <EnteteFichier
        nom={competence.nom}
        portee={competence.portee}
        origine={competence.origine}
      >
        <p className="mt-2.5 text-intro text-muted">
          {workflow.etapes.length} étapes ·{" "}
          <span className={arrets > 0 ? "text-danger" : undefined}>
            {arrets} arrêt{arrets > 1 ? "s" : ""} dur{arrets > 1 ? "s" : ""}
          </span>{" "}
          ·{" "}
          {workflow.depart
            ? `entrée déclarée à l'étape ${workflow.depart}`
            : "entrée non déclarée, la première du tableau fait foi"}
          {manquantes > 0 && (
            <span className="text-danger"> · {manquantes} fichier(s) d&apos;étape absent(s)</span>
          )}
        </p>
        <Link
          href={`/competence/${encodeURIComponent(competence.chemin)}`}
          className="mt-1.5 inline-flex items-center gap-1.5 text-corps text-accent-soft underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent"
        >
          <Icone nom="editer" taille={13} trait={1.8} />
          modifier la compétence
        </Link>
      </EnteteFichier>

      {/* La barre d'outils passe au-dessus du plan : les gestes qui modifient
          la séquence se lisent avant elle, pas après un défilement de dix
          étapes. */}
      <AtelierWorkflow
        cheminSkill={competence.chemin}
        etapes={workflow.etapes.map((e) => ({
          numero: e.numero,
          role: e.role,
          chemin: e.cheminAbsolu,
          present: e.present,
          agents: e.agents,
        }))}
        agentsDisponibles={[...new Set(atelier.agents.map((a) => a.nom))].sort()}
        modifiable={refus === ""}
        raisonDuRefus={refus}
        numerotationATrou={numerotationATrou}
      />

      <PlanWorkflow workflow={workflow} destinations={destinations(atelier, workflow, competence.chemin)} />

      <p className="mt-5 font-mono text-meta text-muted">
        trait plein : l&apos;étape nomme elle-même la suivante · trait pointillé : ordre du
        tableau seulement
      </p>

      {workflow.orphelins.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-section font-semibold">
            Fichiers hors séquence
          </h2>
          <p className="mb-2.5 text-description text-muted">
            Présents dans le dossier d&apos;étapes, absents du tableau : jamais lus.
          </p>
          <ul className="card px-5">
            {workflow.orphelins.map((chemin) => (
              <li key={chemin} className="border-b border-line-faible py-2.5 font-mono text-meta-lg last:border-0">
                {chemin}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/**
 * Où mène chaque élément du plan.
 *
 * Une étape mène à son fichier, un satellite à l'écran de l'agent ou de la
 * compétence qu'il nomme. Chaque lien emporte le chemin du workflow en
 * paramètre : l'éditeur ouvert saura ramener ICI, et pas à l'inventaire.
 *
 * Ce qui n'a pas de destination n'en reçoit pas : un fichier d'étape absent du
 * disque, une commande sans écran, un agent fourni par un plugin. Un lien qui
 * mène à un 404 vaut moins que pas de lien.
 */
function destinations(
  atelier: ReturnType<typeof lireAtelier>,
  workflow: NonNullable<ReturnType<typeof lireWorkflow>>,
  cheminDuWorkflow: string,
): Record<string, string> {
  const vers: Record<string, string> = {};

  for (const etape of workflow.etapes) {
    if (!etape.present) continue;
    vers[`etape:${etape.numero}:${etape.fichierDeclare}`] = versLEditeur(
      "/etape",
      etape.cheminAbsolu,
      cheminDuWorkflow,
    );
  }

  for (const agent of atelier.agents) {
    vers[`agent:${agent.nom}`] = versLEditeur("/agent", agent.chemin, cheminDuWorkflow);
  }
  for (const c of atelier.competences) {
    vers[`competence:${c.nom}`] = versLEditeur("/competence", c.chemin, cheminDuWorkflow);
  }
  return vers;
}

/** Chaîne vide si ce workflow est modifiable, sinon la raison, en clair. */
function raisonDuRefus(cheminSkill: string): string {
  try {
    verifierChemin(cheminSkill);
    return "";
  } catch (erreur) {
    return erreur instanceof EcritureRefusee ? erreur.message : "Non modifiable.";
  }
}

import { notFound } from "next/navigation";
import { agir } from "./actions";
import { Editeur } from "@/components/editeur/Editeur";
import { ModuleExecution } from "@/components/editeur/ModuleExecution";
import { ModuleIdentite } from "@/components/editeur/ModuleIdentite";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { retourDepuis } from "@/lib/chrome/retour";
import { Silences } from "@/components/primitives";
import { ecritureOuverte } from "@/lib/acces/etat";
import { verifierCheminAgent } from "@/lib/ecriture/agent";
import { lireAtelier } from "@/lib/lecture/atelier";
import { MODELE_DE_SESSION, OUTILS_HERITES } from "@/lib/lecture/documents";
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
  const agent = lireAtelier().agents.find((a) => a.chemin === cible);
  if (!agent) notFound();

  const refus = (await ecritureOuverte())
    ? raisonDuRefus(cible)
    : "L'écriture est fermée sur ce déploiement. La lecture reste entière.";
  const config = lireConfig();
  const modules = 2 + (agent.corps.match(/^##\s+/gm)?.length ?? 0);

  return (
    <main>
      <RetourListe {...retourDepuis(retour, { href: "/agents", libelle: "tous les agents" })} />

      <EnteteFichier
        nom={agent.nom}
        portee={agent.portee}
        origine={agent.origine}
        action={
          <span className="font-mono text-meta text-muted">
            lecture seule — toute écriture passe par Claude
          </span>
        }
      >
        <p className="mt-2 font-mono text-meta-lg text-muted">
          {agent.chemin} · {modules} modules
        </p>
      </EnteteFichier>

      <Silences silences={agent.silences} />

      <Editeur
        fichier={{
          chemin: agent.chemin,
          nom: agent.nom,
          corps: agent.corps,
          entete: entete(agent.chemin, agent.corps),
          nomFichier: nomDuFichier(agent.chemin),
        }}
        action={agir}
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
        modele={config.modele}
        cleConfiguree={config.cleApi !== "" || cliDisponible()}
        refus={refus}
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

/** Chaîne vide si le fichier est modifiable, sinon la raison, en clair. */
function raisonDuRefus(chemin: string): string {
  try {
    verifierCheminAgent(chemin);
    return "";
  } catch (erreur) {
    return erreur instanceof Error ? erreur.message : "Non modifiable.";
  }
}

import { notFound } from "next/navigation";
import { agir } from "./actions";
import { Retrait } from "./Retrait";
import { Editeur } from "@/components/editeur/Editeur";
import { ModuleIdentite } from "@/components/editeur/ModuleIdentite";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { retourDepuis } from "@/lib/chrome/retour";
import { Silences } from "@/components/primitives";
import { ecritureOuverte } from "@/lib/acces/etat";
import { verifierCheminCommande } from "@/lib/ecriture/commande";
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
  const commande = lireAtelier().commandes.find((c) => c.chemin === cible);
  if (!commande) notFound();

  const refus = (await ecritureOuverte())
    ? raisonDuRefus(cible)
    : "L'écriture est fermée sur ce déploiement. La lecture reste entière.";
  const config = lireConfig();
  const modules = 1 + (commande.corps.match(/^##\s+/gm)?.length ?? 0);

  return (
    <main>
      <RetourListe {...retourDepuis(retour, { href: "/agents", libelle: "toutes les commandes" })} />

      <EnteteFichier
        nom={`/${commande.nom}`}
        portee={commande.portee}
        origine={commande.origine}
        action={
          refus ? (
            <span className="font-mono text-meta text-muted">lecture seule</span>
          ) : (
            <Retrait chemin={commande.chemin} nom={commande.nom} />
          )
        }
      >
        <p className="mt-2 font-mono text-meta-lg text-muted">
          {commande.chemin} · {modules} modules
        </p>
      </EnteteFichier>

      <Silences silences={commande.silences} />

      <Editeur
        fichier={{
          chemin: commande.chemin,
          nom: commande.nom,
          corps: commande.corps,
          entete: entete(commande.chemin, commande.corps),
          nomFichier: nomDuFichier(commande.chemin),
        }}
        action={agir}
        modulesFixes={
          <ModuleIdentite
            icone="commande"
            description={commande.description}
            indiceArgument={commande.indiceArgument}
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
 * La lecture rend le corps comme la fin exacte du fichier : l'en-tête est donc
 * tout ce qui précède, au caractère près. Le reconstruire en re-sérialisant le
 * YAML détruirait les lignes que YAML strict refuse — un `argument-hint` en
 * porte presque toujours une.
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
    verifierCheminCommande(chemin);
    return "";
  } catch (erreur) {
    return erreur instanceof Error ? erreur.message : "Non modifiable.";
  }
}

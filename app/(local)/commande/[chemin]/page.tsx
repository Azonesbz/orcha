import { notFound } from "next/navigation";
import { Retrait } from "./Retrait";
import { Lecteur } from "@/components/lecteur/Lecteur";
import { ModuleIdentite } from "@/components/lecteur/ModuleIdentite";
import { EnteteFichier, RetourListe } from "@/components/EnteteFichier";
import { retourDepuis } from "@/lib/chrome/retour";
import { Silences } from "@/components/primitives";
import { ecritureOuverte } from "@/lib/acces/etat";
import { verifierCheminCommande } from "@/lib/ecriture/commande";
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
  const commande = lireAtelier().commandes.find((c) => c.chemin === cible);
  if (!commande) notFound();

  const refus = (await ecritureOuverte())
    ? raisonDuRefus(cible)
    : "L'écriture est fermée sur ce déploiement. La lecture reste entière.";
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

      <Lecteur
        fichier={{
          corps: commande.corps,
          entete: entete(commande.chemin, commande.corps),
          nomFichier: nomDuFichier(commande.chemin),
        }}
        modulesFixes={
          <ModuleIdentite
            icone="commande"
            description={commande.description}
            indiceArgument={commande.indiceArgument}
          />
        }
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

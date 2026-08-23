"use client";

import { useActionState, useMemo } from "react";
import { ApercuFichier } from "./ApercuFichier";
import { ModuleFichier } from "./ModuleFichier";
import { PanneauModifier } from "./PanneauModifier";
import { decouperCorps } from "@/lib/modules/decoupe";
import { comparerCorps } from "@/lib/modules/difference";


/** Ce que rendent les gestes de l'éditeur, côté serveur. */
export interface Retour {
  etat: "vierge" | "propose" | "applique" | "refuse";
  message: string;
  /** Le corps proposé par Claude. Vide tant qu'il n'y a rien à regarder. */
  proposition: string;
}

/* Défini ici et non dans un `actions.ts` : un module « use server » ne peut
   exporter que des fonctions asynchrones — une constante y devient une
   référence serveur, toujours vraie, et le panneau croyait avoir une
   proposition dès le premier rendu. */
const VIERGE: Retour = { etat: "vierge", message: "", proposition: "" };

export interface Fichier {
  chemin: string;
  nom: string;
  /** Le corps seul — ce que la proposition remplace. */
  corps: string;
  /** Le frontmatter, délimiteurs compris. Jamais modifié, mais montré. */
  entete: string;
  nomFichier: string;
}

export type ActionEditeur = (precedent: Retour, formulaire: FormData) => Promise<Retour>;

/**
 * L'éditeur en modules.
 *
 * Le fichier se lit en modules ; rien ne s'y modifie à la main. Une
 * proposition remplace le corps affiché sans rien écrire : les modules
 * montrent alors ce qui changerait, l'aperçu montre où, et « Appliquer » est
 * le seul geste qui touche le disque.
 */
export function Editeur({
  fichier,
  action: geste,
  modulesFixes,
  modele,
  cleConfiguree,
  refus,
}: {
  fichier: Fichier;
  /** Le geste serveur — compétence ou sous-agent, l'écran est le même. */
  action: ActionEditeur;
  /** Ce que le frontmatter déclare : identité, et l'exécution pour un agent. */
  modulesFixes: React.ReactNode;
  modele: string;
  cleConfiguree: boolean;
  refus: string;
}) {
  const [retour, action, enCours] = useActionState(geste, VIERGE);
  const proposition = retour.proposition;

  const corpsAffiche = proposition || fichier.corps;
  const modules = useMemo(() => decouperCorps(corpsAffiche), [corpsAffiche]);
  const changements = useMemo(
    () => (proposition ? comparerCorps(fichier.corps, proposition) : []),
    [fichier.corps, proposition],
  );

  /* Les index proposés, module par module : c'est ce qui allume la
     surbrillance d'une entrée sans que la carte ait à connaître le diff. */
  const proposeesPar = useMemo(() => {
    const carte = new Map<string, Set<number>>();
    for (const c of changements) {
      if (c.index === null) continue;
      const vus = carte.get(c.titre) ?? new Set<number>();
      vus.add(c.index);
      carte.set(c.titre, vus);
    }
    return carte;
  }, [changements]);

  const vide = new Set<number>();

  return (
    <form action={action} className="flex flex-wrap items-start gap-6">
      <input type="hidden" name="chemin" value={fichier.chemin} />
      <input type="hidden" name="nom" value={fichier.nom} />
      <input type="hidden" name="corps" value={fichier.corps} />
      <input type="hidden" name="proposition" value={proposition} />

      <div className="flex min-w-[26rem] flex-1 flex-col gap-3.5">
        {modulesFixes}
        {modules.map((module) => (
          <ModuleFichier
            key={module.cle}
            module={module}
            proposees={proposeesPar.get(module.titre) ?? vide}
          />
        ))}
      </div>

      <aside className="flex w-100 shrink-0 flex-col gap-3.5">
        <PanneauModifier
          changements={changements}
          aProposition={proposition !== ""}
          enCours={enCours}
          erreur={retour.etat === "refuse" ? retour.message : ""}
          modele={modele}
          cleConfiguree={cleConfiguree}
          refus={refus}
        />
        <ApercuFichier
          nomFichier={fichier.nomFichier}
          texte={fichier.entete + corpsAffiche}
          original={fichier.entete + fichier.corps}
        />
      </aside>
    </form>
  );
}

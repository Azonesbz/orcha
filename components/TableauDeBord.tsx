"use client";

import { useState } from "react";
import { Ecarts, RepartitionPortee, Tuile } from "@/components/tableau-de-bord";
import { Bascule } from "@/components/Bascule";
import type { Resume } from "@/lib/resume";

/**
 * Le tableau de bord, avec ou sans les réglages personnels.
 *
 * Les deux résumés sont calculés au serveur et passés ensemble : compter les
 * étapes mortes d'un workflow demande de lire le disque, et refaire ce calcul
 * ici fabriquerait une seconde vérité.
 */
export function TableauDeBord({
  avec,
  sans,
  racineUtilisateur,
  veilleInstallee,
}: {
  avec: Resume;
  sans: Resume;
  racineUtilisateur: string;
  veilleInstallee: boolean;
}) {
  const [inclurePersonnel, setInclurePersonnel] = useState(true);
  const r = inclurePersonnel ? avec : sans;

  return (
    <>
      <Bascule active={inclurePersonnel} surChangement={setInclurePersonnel}>
        inclure les réglages personnels{" "}
        <span className="font-mono text-meta text-muted">{racineUtilisateur}</span>
      </Bascule>

      <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          titre="Sans effet"
          valeur={r.ecarts.length}
          precision={r.ecarts.length === 0 ? "rien à corriger" : "détail ci-dessous"}
          icone="alerte"
          alerte={r.ecarts.length > 0}
        />
        <Tuile
          titre="Compétences"
          valeur={r.competences}
          precision={`dont ${r.aLaMain} lancées à la main`}
          icone="competences"
          href="/competences"
        />
        <Tuile
          titre="Workflows"
          valeur={r.workflows}
          precision={`${r.etapes} étapes, ${r.arrets} arrêts durs`}
          icone="workflows"
          href="/workflows"
        />
        <Tuile
          titre="Agents et commandes"
          valeur={r.agents + r.commandes}
          precision={`${r.agents} agents · ${r.commandes} commandes`}
          icone="agents"
          href="/agents"
        />
        <Tuile
          titre="Plugins actifs"
          valeur={r.plugins}
          precision={`${r.catalogue} au catalogue, non activés`}
          icone="brancher"
          href="/reglages"
        />
        <Tuile
          titre="Permissions"
          valeur={r.permissions}
          precision={`${r.deny} deny · ${r.ask} ask`}
          icone="permissions"
          href="/reglages"
        />
        <Tuile
          titre="Hooks"
          valeur={r.hooks}
          precision="lancés automatiquement"
          icone="hooks"
          href="/reglages"
        />
        <Tuile
          titre="Veille"
          valeur={veilleInstallee ? "en place" : "absente"}
          precision={veilleInstallee ? "prévient au démarrage" : "à installer"}
          icone="veille"
          href="/veille"
          alerte={!veilleInstallee}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ecarts lignes={r.ecarts} />
        <RepartitionPortee parts={r.parts} />
      </div>
    </>
  );
}

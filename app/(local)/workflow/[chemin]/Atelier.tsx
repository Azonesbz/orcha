"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icone, type NomIcone } from "@/components/icones";
import { Modale } from "@/components/Modale";
import {
  ajouter,
  apercuRenumerotation,
  appliquerRenumerotationAction,
  brancher,
  creer,
  debrancher,
  retirer,
  verifierRetrait,
  type Retour,
} from "./actions";

const VIERGE: Retour = { etat: "vierge", message: "" };

export interface EtapeBranchable {
  numero: string;
  role: string;
  chemin: string;
  present: boolean;
  agents: string[];
}

/** Les trois gestes d'édition, sous le plan : ajouter, brancher, créer. */
export function AtelierWorkflow({
  cheminSkill,
  etapes,
  agentsDisponibles,
  modifiable,
  raisonDuRefus,
  numerotationATrou,
}: {
  cheminSkill: string;
  etapes: EtapeBranchable[];
  agentsDisponibles: string[];
  modifiable: boolean;
  raisonDuRefus: string;
  numerotationATrou: boolean;
}) {
  if (!modifiable) {
    return (
      <p className="mb-5 rounded-lg border border-danger/30 bg-danger-wash px-3 py-2 text-corps text-danger">
        {raisonDuRefus}
      </p>
    );
  }

  return <BarreOutils cheminSkill={cheminSkill} etapes={etapes} agents={agentsDisponibles} numerotationATrou={numerotationATrou} />;
}

type Outil = "ajout" | "branchement" | "agent" | "retrait" | "renumerotation";

/**
 * Une barre d'icônes, et une modale par geste.
 *
 * Les cinq formulaires empilés prenaient plus de place que le plan qu'ils
 * servent à modifier, et poussaient les étapes hors de l'écran. Ils ne sont
 * ouverts que quand on les demande.
 */
function BarreOutils({
  cheminSkill,
  etapes,
  agents,
  numerotationATrou,
}: {
  cheminSkill: string;
  etapes: EtapeBranchable[];
  agents: string[];
  numerotationATrou: boolean;
}) {
  const [ouvert, setOuvert] = useState<Outil | null>(null);
  const fermer = () => setOuvert(null);

  /* Un seul primaire par écran : ajouter une étape. Les deux gestes de
     branchement portent le Ciel du sous-agent ; retirer et renuméroter restent
     fantômes — ils défont, ils ne construisent pas. */
  const OUTILS: Array<{
    cle: Outil;
    icone: NomIcone;
    libelle: string;
    allure: "primaire" | "surface" | "fantome";
  }> = [
    { cle: "ajout", icone: "ajouter", libelle: "Ajouter une étape", allure: "primaire" },
    { cle: "branchement", icone: "brancher", libelle: "Brancher un sous-agent", allure: "surface" },
    { cle: "agent", icone: "creer-agent", libelle: "Créer un sous-agent", allure: "surface" },
    { cle: "retrait", icone: "retirer", libelle: "Retirer une étape", allure: "fantome" },
    ...(numerotationATrou
      ? ([{ cle: "renumerotation", icone: "numeroter", libelle: "Renuméroter", allure: "fantome" }] as const)
      : []),
  ];

  const CLASSE = { primaire: "btn-primary", surface: "btn-surface", fantome: "btn-ghost" } as const;

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2.5">
        {OUTILS.map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOuvert(o.cle)}
            className={CLASSE[o.allure]}
          >
            <span className={o.allure === "surface" ? "text-sky" : undefined}>
              <Icone nom={o.icone} taille={15} trait={o.allure === "surface" ? 1.8 : 2} />
            </span>
            {o.libelle}
          </button>
        ))}
      </div>

      <Modale
        ouverte={ouvert === "ajout"}
        onFermer={fermer}
        titre="Ajouter une étape"
        aide="Le fichier est créé et la ligne ajoutée au tableau. Les deux, ou rien."
      >
        <AjoutEtape cheminSkill={cheminSkill} />
      </Modale>

      <Modale
        ouverte={ouvert === "branchement"}
        onFermer={fermer}
        titre="Brancher un sous-agent"
        aide="Écrit dans la section « Sous-agents » de l'étape. Ta prose n'est jamais touchée, ni pour brancher ni pour retirer."
      >
        <Branchement etapes={etapes} agents={agents} />
      </Modale>

      <Modale
        ouverte={ouvert === "agent"}
        onFermer={fermer}
        titre="Créer un sous-agent"
        aide="Écrit agents/<nom>.md. La description décide s'il sera choisi — soigne-la."
      >
        <CreationAgent />
      </Modale>

      <Modale
        ouverte={ouvert === "retrait"}
        onFermer={fermer}
        titre="Retirer une étape"
        aide="En deux temps : on montre d'abord ce qui partira, on écrit ensuite. Rien n'est effacé — le fichier va dans retirees/."
      >
        <RetraitEtape cheminSkill={cheminSkill} etapes={etapes} />
      </Modale>

      <Modale
        ouverte={ouvert === "renumerotation"}
        onFermer={fermer}
        titre="Renuméroter la séquence"
        aide="Referme les trous. Renomme les fichiers et suit tous les renvois — montré avant d'être écrit."
      >
        <Renumerotation cheminSkill={cheminSkill} />
      </Modale>
    </>
  );
}

function AjoutEtape({ cheminSkill }: { cheminSkill: string }) {
  const [retour, action, enCours] = useActionState(ajouter, VIERGE);
  const formulaire = useVidangeApresSucces(retour);
  return (
    <>
      <form ref={formulaire} action={action} className="space-y-2">
        <input type="hidden" name="skill" value={cheminSkill} />
        <Champ name="titre" placeholder="Titre de l'étape" required />
        <Champ name="sortie" placeholder="Sortie attendue" />
        <Bouton enCours={enCours}>Créer l&apos;étape</Bouton>
        <Message retour={retour} />
      </form>
    </>
  );
}

function Branchement({ etapes, agents }: { etapes: EtapeBranchable[]; agents: string[] }) {
  const [retour, brancherAction, enCours] = useActionState(brancher, VIERGE);
  const [retourDebranche, debrancherAction, enCoursDebranche] = useActionState(debrancher, VIERGE);
  const [choisie, setChoisie] = useState(etapes[0]?.chemin ?? "");
  const etape = etapes.find((e) => e.chemin === choisie);
  const dernier = retourDebranche.etat !== "vierge" ? retourDebranche : retour;

  return (
    <>
      <form className="space-y-2">
        <select
          name="etape"
          value={choisie}
          onChange={(e) => setChoisie(e.target.value)}
          className="field"
        >
          {etapes.map((e) => (
            <option key={e.chemin} value={e.chemin} disabled={!e.present}>
              {e.numero} · {e.role}
              {e.present ? "" : " (fichier absent)"}
            </option>
          ))}
        </select>
        <select name="agent" className="field font-mono">
          {agents.map((nom) => (
            <option key={nom} value={nom}>
              {nom}
              {etape?.agents.includes(nom) ? " — déjà branché" : ""}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Bouton enCours={enCours} formAction={brancherAction}>
            Brancher
          </Bouton>
          <BoutonDestructif enCours={enCoursDebranche} formAction={debrancherAction}>
            Débrancher
          </BoutonDestructif>
        </div>
        <Message retour={dernier} />
      </form>
    </>
  );
}

/**
 * Le retrait, en deux temps.
 *
 * Le premier montre le fichier visé et sa destination, en absolu, plus la
 * ligne du tableau qui disparaîtra. Le second écrit — et refuse si les
 * fichiers ont bougé entre-temps, grâce au jeton reposté.
 */
function RetraitEtape({ cheminSkill, etapes }: { cheminSkill: string; etapes: EtapeBranchable[] }) {
  const [apercu, verifier, enCoursVoir] = useActionState(verifierRetrait, VIERGE);
  const [ecriture, appliquer, enCoursEcrire] = useActionState(retirer, VIERGE);
  const [numero, setNumero] = useState("");
  const dernier = ecriture.etat !== "vierge" ? ecriture : apercu;
  const aConfirmer = apercu.etat === "fait" && apercu.empreinte && ecriture.etat !== "fait";

  return (
    <>
      <div className="space-y-2">
        <form action={verifier} className="space-y-2">
          <input type="hidden" name="skill" value={cheminSkill} />
          <select
            name="numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="field"
          >
            <option value="" disabled>
              choisir l&apos;étape à retirer…
            </option>
            {etapes.map((e) => (
              <option key={e.chemin} value={e.numero}>
                {e.numero} · {e.role}
                {e.present ? "" : " (fichier déjà absent)"}
              </option>
            ))}
          </select>
          <Bouton enCours={enCoursVoir} libelleEnCours="Lecture…">
            Vérifier ce qui partira
          </Bouton>
        </form>

        {dernier.details && (
          <ul className="overflow-x-auto rounded border border-line p-2 font-mono text-[10px] leading-relaxed text-muted">
            {dernier.details.map((ligne, i) => (
              <li key={i} className="whitespace-nowrap">
                {ligne}
              </li>
            ))}
          </ul>
        )}

        <Message retour={dernier} />

        {aConfirmer && (
          <form action={appliquer}>
            <input type="hidden" name="skill" value={cheminSkill} />
            <input type="hidden" name="numero" value={numero} />
            <input type="hidden" name="empreinte" value={apercu.empreinte} />
            <BoutonDestructif enCours={enCoursEcrire}>
              Confirmer le retrait de l&apos;étape {numero}
            </BoutonDestructif>
          </form>
        )}
      </div>
    </>
  );
}

/**
 * La seule action qui se montre avant de s'écrire.
 *
 * Elle touche le nom des fichiers, le tableau, les titres et tous les renvois
 * croisés : personne ne devrait lancer ça sans avoir lu ce qui va changer.
 * Deux formulaires plutôt qu'un à deux modes — un bouton porteur de
 * `formAction` ne peut pas porter de `name`, React s'en sert lui-même.
 */
function Renumerotation({ cheminSkill }: { cheminSkill: string }) {
  const [apercu, voir, enCoursVoir] = useActionState(apercuRenumerotation, VIERGE);
  const [ecriture, appliquer, enCoursEcrire] = useActionState(appliquerRenumerotationAction, VIERGE);
  const dernier = ecriture.etat !== "vierge" ? ecriture : apercu;
  const aMontrer = apercu.etat === "fait" && (apercu.details?.length ?? 0) > 0;
  const dejaEcrit = ecriture.etat === "fait";

  return (
    <>
      <div className="space-y-2">
        <form action={voir}>
          <input type="hidden" name="skill" value={cheminSkill} />
          <Bouton enCours={enCoursVoir} libelleEnCours="Lecture…">
            Voir ce qui changerait
          </Bouton>
        </form>

        {dernier.details && (
          <ul className="max-h-64 overflow-y-auto rounded border border-line p-2 font-mono text-[10px] leading-relaxed text-muted">
            {dernier.details.map((ligne, i) => (
              <li key={i} className="truncate" title={ligne}>
                {ligne}
              </li>
            ))}
          </ul>
        )}

        <Message retour={dernier} />

        {aMontrer && !dejaEcrit && (
          <form action={appliquer}>
            <input type="hidden" name="skill" value={cheminSkill} />
            <input type="hidden" name="empreinte" value={apercu.empreinte ?? ""} />
            <BoutonSecond enCours={enCoursEcrire}>Appliquer la renumérotation</BoutonSecond>
          </form>
        )}
      </div>
    </>
  );
}

function CreationAgent() {
  const [retour, action, enCours] = useActionState(creer, VIERGE);
  const formulaire = useVidangeApresSucces(retour);
  return (
    <>
      <form ref={formulaire} action={action} className="space-y-2">
        <Champ name="nom" placeholder="nom-en-minuscules" required />
        <textarea
          name="description"
          rows={2}
          required
          placeholder="Quand déléguer à cet agent, et pour quoi faire"
          className="field"
        />
        <div className="grid grid-cols-2 gap-2">
          <Champ name="outils" placeholder="tools (facultatif)" />
          <Champ name="modele" placeholder="model (facultatif)" />
        </div>
        <select name="portee" className="field">
          <option value="utilisateur">portée utilisateur (~/.claude)</option>
          <option value="projet">portée projet (.claude du projet)</option>
        </select>
        <Bouton enCours={enCours}>Créer l&apos;agent</Bouton>
        <Message retour={retour} />
      </form>
    </>
  );
}

function Champ(proprietes: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...proprietes} className="field" />;
}

/**
 * Vide le formulaire après une création réussie.
 *
 * Sans ça, la saisie reste en place et un second clic recrée légitimement la
 * même chose — c'est l'autre moitié du doublon, celle que le refus serveur
 * transforme en message d'erreur plutôt qu'en fichier de trop.
 */
function useVidangeApresSucces(retour: Retour) {
  const formulaire = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (retour.etat === "fait") formulaire.current?.reset();
  }, [retour]);
  return formulaire;
}

interface ProprietesBouton {
  enCours: boolean;
  children: React.ReactNode;
  formAction?: (donnees: FormData) => void;
  /** « Écriture… » par défaut ; « Lecture… » pour ce qui ne touche à rien. */
  libelleEnCours?: string;
}

function Bouton({ enCours, children, formAction, libelleEnCours }: ProprietesBouton) {
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={enCours}
      className="btn-primary w-full"
    >
      {enCours ? (libelleEnCours ?? "Écriture…") : children}
    </button>
  );
}

/**
 * Pour ce qui retire. Le rouge n'était jusqu'ici que la couleur des refus :
 * il devient celle des gestes qui enlèvent, pour que la règle s'apprenne.
 */
function BoutonDestructif({ enCours, children, formAction }: ProprietesBouton) {
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={enCours}
      className="btn-danger w-full"
    >
      {enCours ? "Écriture…" : children}
    </button>
  );
}

/** Pour ce qui est secondaire sans rien enlever. */
function BoutonSecond({ enCours, children, formAction }: ProprietesBouton) {
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={enCours}
      className="btn-secondary w-full"
    >
      {enCours ? "Écriture…" : children}
    </button>
  );
}

function Message({ retour }: { retour: Retour }) {
  if (retour.etat === "vierge") return null;
  return (
    <p
      role={retour.etat === "refuse" ? "alert" : "status"}
      className={`text-xs ${retour.etat === "fait" ? "text-ink-soft" : "text-danger"}`}
    >
      {retour.message}
    </p>
  );
}

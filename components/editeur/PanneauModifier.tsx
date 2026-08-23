"use client";

import { Icone } from "@/components/icones";
import { MODELES } from "@/lib/reglages/modeles";
import type { Changement } from "@/lib/modules/difference";

/**
 * Le seul chemin d'écriture de l'éditeur.
 *
 * On décrit le changement, le modèle propose des blocs, et rien n'atteint le
 * disque avant « Appliquer ». Ce n'est pas une précaution d'interface : c'est
 * la doctrine d'Orcha — il montre, il n'agit pas de lui-même.
 */
export function PanneauModifier({
  changements,
  aProposition,
  enCours,
  erreur,
  modele,
  cleConfiguree,
  refus,
}: {
  changements: Changement[];
  aProposition: boolean;
  enCours: boolean;
  erreur: string;
  modele: string;
  /** Sans clé, le panneau reste visible mais dit où la mettre. */
  cleConfiguree: boolean;
  /** La raison pour laquelle ce fichier n'est pas modifiable, s'il ne l'est pas. */
  refus: string;
}) {
  return (
    <div className="card flex flex-col gap-3 border-accent/25 p-[18px]">
      <div className="flex items-center gap-2.5">
        <span className="text-accent">
          <Icone nom="proposer" taille={16} />
        </span>
        <span className="text-module font-semibold">Modifier avec Claude</span>
        <span className="ml-auto font-mono text-etiquette text-faint">seul chemin d&apos;écriture</span>
      </div>

      {refus ? (
        <p className="rounded-controle border border-danger/30 bg-danger-wash px-3 py-2 text-description text-danger">
          {refus}
        </p>
      ) : (
        <>
          <textarea
            name="instruction"
            rows={2}
            disabled={!cleConfiguree}
            placeholder="ex. ajoute une étape : vérifier les chiffres cités"
            className="field resize-y bg-paper px-3 py-2.5 text-note leading-[1.6] disabled:opacity-45"
          />
          <div className="flex items-center gap-2.5">
            <select
              name="modele"
              defaultValue={modele}
              disabled={!cleConfiguree}
              className="flex-1 rounded-lg border border-line-strong bg-paper px-2.5 py-2 font-mono text-[11.5px] text-ink disabled:opacity-45"
            >
              {MODELES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="submit"
              name="intention"
              value="proposer"
              disabled={enCours || !cleConfiguree}
              className="btn-primary min-h-0 shrink-0 px-3.5 py-2.5 text-description"
            >
              {enCours ? "En cours…" : "Proposer"}
            </button>
          </div>
        </>
      )}

      {erreur && <p className="font-mono text-meta text-danger">{erreur}</p>}

      {aProposition && <Blocs changements={changements} />}

      <p className="font-mono text-etiquette text-faint">
        {cleConfiguree
          ? "rien n'est écrit sans Appliquer · clé API : Réglages"
          : "aucune clé d'API — à ajouter dans Réglages pour activer ce panneau"}
      </p>
    </div>
  );
}

/** Ce que la proposition change, bloc par bloc, avant toute écriture. */
function Blocs({ changements }: { changements: Changement[] }) {
  if (changements.length === 0) {
    return (
      <p className="font-mono text-meta text-muted">
        le modèle n&apos;a rien changé — reformule la demande
      </p>
    );
  }

  return (
    <>
      <div className="rounded-controle border border-dashed border-accent/50 bg-accent/5 px-3 py-2.5">
        <span className="etiquette">
          {changements.length} bloc{changements.length > 1 ? "s" : ""} proposé
          {changements.length > 1 ? "s" : ""}
        </span>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {changements.map((c, i) => (
            <li key={i} className="text-description">
              <span className={`font-mono text-meta ${TEINTE[c.sorte]}`}>
                {SIGNE[c.sorte]} {c.titre.toLowerCase()}
                {c.position ? ` · ${c.position}` : ""}
              </span>{" "}
              — {c.texte}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2.5">
        <button
          type="submit"
          name="intention"
          value="appliquer"
          className="btn-primary min-h-0 px-3.5 py-2 text-description"
        >
          <Icone nom="valider" taille={13} trait={2.2} />
          Appliquer
        </button>
        <button
          type="submit"
          name="intention"
          value="rejeter"
          className="btn-secondary min-h-0 border-line-soft px-3.5 py-2 text-description text-muted"
        >
          Rejeter
        </button>
      </div>
    </>
  );
}

const SIGNE = { ajout: "+", retrait: "−", modification: "~" } as const;
const TEINTE = {
  ajout: "text-accent",
  retrait: "text-danger",
  modification: "text-sky",
} as const;

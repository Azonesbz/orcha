"use client";

import { useState } from "react";
import { trier, type EtapeMesuree, type Tri } from "@/lib/lecture/mesures";
import { questionDOptimisation } from "@/lib/agent/question";
import { appelerLAgent } from "@/components/agent/appel";
import { Icone } from "@/components/icones";
import { duree } from "@/lib/temps";

/**
 * Les étapes mesurées, classées par ce qu'elles coûtent.
 *
 * Le classement par défaut est le **temps d'exécution** et non l'ordre du plan :
 * la question qu'on pose à cet écran est « qu'est-ce qui coûte », et le plan
 * ordonné est déjà juste au-dessus. Le numéro d'étape reste en tête de chaque
 * ligne — c'est lui qui fait la jointure avec le schéma, quel que soit l'ordre.
 *
 * Le tri est ici et pas dans l'URL : il se change dix fois en trente secondes
 * pour comparer deux axes, et un aller-retour serveur par clic sur une lecture
 * de 162 Mo de transcriptions serait absurde.
 */
const CHOIX: ReadonlyArray<{ valeur: Tri; libelle: string }> = [
  { valeur: "execution", libelle: "exécution" },
  { valeur: "attente", libelle: "attente" },
  { valeur: "plan", libelle: "ordre du plan" },
];

export function EtapesMesurees({ etapes, sur }: { etapes: EtapeMesuree[]; sur: number }) {
  const [tri, setTri] = useState<Tri>("execution");

  // L'échelle des barres reste celle du total : un classement change l'ordre
  // des lignes, jamais la longueur d'une barre.
  const maximum = Math.max(...etapes.map((e) => e.machine + e.attente), 1);

  return (
    <>
      <div
        role="group"
        aria-label="Classer les étapes"
        className="mb-2.5 flex flex-wrap items-center gap-1.5"
      >
        <span aria-hidden className="mr-1 font-mono text-meta text-muted">
          classer par
        </span>
        {CHOIX.map(({ valeur, libelle }) => (
          <button
            key={valeur}
            type="button"
            aria-pressed={tri === valeur}
            onClick={() => setTri(valeur)}
            className={`rounded-md border px-2.5 py-1 font-mono text-meta transition-colors ${
              tri === valeur
                ? "border-accent/40 bg-accent-wash text-accent-soft"
                : "border-line text-muted hover:border-line-soft hover:text-ink-soft"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      <ul className="card px-5">
        {trier(etapes, tri).map((etape) => (
          <Etape key={etape.numero} etape={etape} maximum={maximum} sur={sur} />
        ))}
      </ul>
    </>
  );
}

function Etape({ etape, maximum, sur }: { etape: EtapeMesuree; maximum: number; sur: number }) {
  const observee = etape.sessions > 0;
  const total = etape.machine + etape.attente;

  return (
    <li className="border-b border-line-faible py-3 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className={`font-mono text-meta-lg ${observee ? "text-accent" : "text-faint"}`}>
          {etape.numero}
        </span>
        <span className={`text-corps ${observee ? "" : "text-muted"}`}>{couper(etape.role, 52)}</span>
        {etape.arretDur && <span className="font-mono text-meta text-danger">■ arrêt dur</span>}
        <Optimiser etape={etape} sur={sur} />
        <span className="ml-auto font-mono text-meta text-muted">
          {observee ? (
            <>
              {etape.sessions}/{sur} séance{sur > 1 ? "s" : ""}
              {etape.lectures > etape.sessions && (
                <span className="text-accent-soft"> · {etape.lectures} lectures</span>
              )}
            </>
          ) : (
            <span className="text-faint">non observée</span>
          )}
        </span>
      </div>

      {observee && total > 0 && (
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-line-faible">
            <span className="bg-accent" style={{ width: `${(etape.machine / maximum) * 100}%` }} />
            <span className="bg-sky" style={{ width: `${(etape.attente / maximum) * 100}%` }} />
          </div>
          {/* Vert et bleu tiennent la légende des deux segments de la barre :
              ils ne bougent pas avec le tri, sinon la barre perd sa lecture. */}
          <span className="font-mono text-meta text-muted">
            {duree(etape.machine)} machine
            {etape.attente > 0 && (
              <span className="text-sky"> · {duree(etape.attente)} d&apos;attente</span>
            )}
          </span>
        </div>
      )}
    </li>
  );
}

/**
 * Porter cette ligne à l'agent, chiffres compris.
 *
 * Le bouton n'envoie rien : il ouvre le panneau avec la question écrite. C'est
 * le même agent que celui du reste de l'application, avec le même contexte
 * d'écran — il n'y a pas un second chemin vers un modèle, il y en a un seul.
 */
function Optimiser({ etape, sur }: { etape: EtapeMesuree; sur: number }) {
  return (
    <button
      type="button"
      onClick={() => appelerLAgent(questionDOptimisation(etape, sur))}
      title="Demander à l'agent comment alléger cette étape"
      aria-label={`Demander à l'agent comment alléger l'étape ${etape.numero}`}
      className="text-faint transition-colors hover:text-accent focus-visible:text-accent"
    >
      <Icone nom="proposer" taille={14} />
    </button>
  );
}

function couper(texte: string, maximum: number): string {
  return texte.length <= maximum ? texte : `${texte.slice(0, maximum - 1)}…`;
}

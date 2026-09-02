/**
 * Le plan déclaré, mis en face de son déroulé.
 *
 * `workflow.ts` dit ce que la compétence annonce ; `deroule.ts` dit ce que les
 * séances ont fait. Ce module croise les deux, et ne produit que de
 * l'arithmétique : des comptes et des durées. **Aucune interprétation** — Orcha
 * lit le disque et ne parle à personne, donc il donne les chiffres et laisse
 * l'humain, ou Claude Code à qui on montre la page, en tirer la conclusion.
 *
 * Les quatre mesures : la couverture du plan, la répartition du temps entre
 * machine et attente humaine, le coût des arrêts durs, et le travail repris.
 */

import { basename } from "node:path";
import type { Intervalle, Session } from "./deroule.ts";
import type { Workflow } from "./workflow.ts";

export interface EtapeMesuree {
  numero: string;
  role: string;
  arretDur: boolean;
  /** Combien de séances ont lu son fichier. Zéro : non observée, jamais « non faite ». */
  sessions: number;
  /** Toutes lectures confondues. Plus que `sessions` : l'étape a été reprise. */
  lectures: number;
  /** Temps pendant lequel la machine travaillait sur cette étape. */
  machine: number;
  /** Temps passé à attendre une réponse humaine pendant cette étape. */
  attente: number;
}

export interface SessionMesuree {
  id: string;
  titre: string | null;
  /** Machine plus attente, pauses déduites : `fin - debut` mentirait sur une reprise. */
  duree: number;
  attente: number;
  /** Les agents dans l'ordre, appels consécutifs au même repliés. */
  chaine: string[];
  /** Ceux qui reviennent après qu'un autre est passé : du travail repris. */
  reprises: string[];
  derniereEtape: string | null;
  aboutie: boolean;
}

export interface Deroule {
  etapes: EtapeMesuree[];
  /** Seulement les séances qui ont franchi au moins une étape de CE workflow. */
  sessions: SessionMesuree[];
  /** Les autres : elles travaillaient ailleurs, elles ne prouvent rien ici. */
  horsWorkflow: number;
  /** Transcriptions dont rien n'a été reconnu — un écart, pas un zéro. */
  nonReconnues: number;
}

export function mesurer(workflow: Workflow, sessions: Session[]): Deroule {
  const numeroDuFichier = new Map(workflow.etapes.map((e) => [basename(e.fichierDeclare), e.numero]));
  const etapes: EtapeMesuree[] = workflow.etapes.map((e) => ({
    numero: e.numero,
    role: e.role,
    arretDur: e.arretDur,
    sessions: 0,
    lectures: 0,
    machine: 0,
    attente: 0,
  }));
  const parNumero = new Map(etapes.map((e) => [e.numero, e]));
  const dernierNumero = workflow.etapes.at(-1)?.numero ?? null;

  const mesurees: SessionMesuree[] = [];
  let horsWorkflow = 0;
  let nonReconnues = 0;

  for (const session of sessions) {
    if (!session.reconnue) {
      nonReconnues++;
      continue;
    }
    const passages = session.fichiersLus
      .map((f) => ({ numero: numeroDuFichier.get(f.fichier), a: f.a }))
      .filter((p): p is { numero: string; a: number } => p.numero !== undefined);

    if (passages.length === 0) {
      horsWorkflow++;
      continue;
    }
    repartirLeTemps(passages, session, parNumero);
    for (const numero of new Set(passages.map((p) => p.numero))) {
      parNumero.get(numero)!.sessions++;
    }
    mesurees.push(resumer(session, passages, dernierNumero));
  }
  return { etapes, sessions: mesurees, horsWorkflow, nonReconnues };
}

/** Sur quoi classer les étapes : l'ordre déclaré, ou ce qu'elles coûtent. */
export type Tri = "plan" | "execution" | "attente";

const COUT: Record<Exclude<Tri, "plan">, (etape: EtapeMesuree) => number> = {
  execution: (e) => e.machine,
  attente: (e) => e.attente,
};

/**
 * Les étapes classées, sans toucher au tableau reçu.
 *
 * `sort` trie en place : rendre le tableau de `mesurer` réordonné ferait de
 * l'affichage une écriture sur la mesure. Le tri est stable en JavaScript, donc
 * à coût égal l'ordre du plan tranche tout seul — c'est ce qu'on veut : deux
 * étapes non observées restent dans l'ordre où elles sont déclarées.
 */
export function trier(etapes: EtapeMesuree[], tri: Tri): EtapeMesuree[] {
  if (tri === "plan") return [...etapes];
  const cout = COUT[tri];
  return [...etapes].sort((a, b) => cout(b) - cout(a));
}

/**
 * Chaque segment va à l'étape ouverte au moment où il court.
 *
 * Une étape court de sa lecture jusqu'à la lecture suivante — la dernière
 * jusqu'à la fin de la séance. Ce qui précède la première lecture n'est porté
 * par personne : c'est le préambule, pas une étape.
 */
function repartirLeTemps(
  passages: Array<{ numero: string; a: number }>,
  session: Session,
  parNumero: Map<string, EtapeMesuree>,
): void {
  for (let i = 0; i < passages.length; i++) {
    const etape = parNumero.get(passages[i].numero)!;
    etape.lectures++;

    const segment = { de: passages[i].a, a: passages[i + 1]?.a ?? session.fin };
    const attente = recouvrement(segment, session.attentes);
    const pause = recouvrement(segment, session.pauses);
    etape.attente += attente;
    etape.machine += Math.max(0, segment.a - segment.de - attente - pause);
  }
}

/** Combien de millisecondes de `segment` sont couverts par `intervalles`. */
function recouvrement(segment: Intervalle, intervalles: Intervalle[]): number {
  let total = 0;
  for (const bloc of intervalles) {
    total += Math.max(0, Math.min(segment.a, bloc.a) - Math.max(segment.de, bloc.de));
  }
  return total;
}

function resumer(
  session: Session,
  passages: Array<{ numero: string; a: number }>,
  dernierNumero: string | null,
): SessionMesuree {
  const chaine = replier(session.agents.map((a) => a.agent));
  const derniereEtape = passages.at(-1)!.numero;
  const pauses = session.pauses.reduce((total, p) => total + (p.a - p.de), 0);

  return {
    id: session.id,
    titre: session.titre,
    duree: Math.max(0, session.fin - session.debut - pauses),
    attente: session.attentes.reduce((total, a) => total + (a.a - a.de), 0),
    chaine,
    reprises: [...new Set(chaine.filter((agent, i) => chaine.indexOf(agent) !== i))],
    derniereEtape,
    aboutie: derniereEtape === dernierNumero,
  };
}

/**
 * Les doublons consécutifs disparaissent.
 *
 * Un agent relancé d'affilée poursuit son travail ; c'est celui qui revient
 * *après un autre* qui signale une boucle — `implementer > reviewer >
 * implementer`.
 */
function replier(agents: string[]): string[] {
  return agents.filter((agent, i) => agent !== agents[i - 1]);
}

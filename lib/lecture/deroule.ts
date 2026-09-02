/**
 * Le déroulé : ce qu'une transcription dit d'une séance de travail.
 *
 * Le plan d'un workflow se lit dans `.claude`. Ce qui s'est *passé* quand il a
 * tourné se lit ailleurs, dans `~/.claude/projects/<projet>/*.jsonl`, un objet
 * JSON par ligne. Ce module ouvre ce fichier et n'en rend que des métriques :
 * des instants, des noms d'étapes, des noms d'agents. **Aucun corps de message
 * n'en sort** — une transcription contient les prompts entiers, donc
 * potentiellement des secrets et des données client.
 *
 * Le format n'est ni documenté ni stable. On lit ce qu'on reconnaît, on compte
 * ce qu'on ne reconnaît pas, et on ne plante jamais : une transcription
 * illisible est une situation normale.
 */

import { closeSync, openSync, readSync, statSync } from "node:fs";
import { basename } from "node:path";
import { StringDecoder } from "node:string_decoder";

/** 64 Ko à la fois : la plus grosse transcription vue pèse 17 Mo. */
const TAMPON = 64 * 1024;

/**
 * Au-delà, ce n'est plus une attente : la séance a été abandonnée puis reprise.
 *
 * Sans ce plafond, une session laissée ouverte la nuit compte douze heures
 * d'« attente humaine » et noie les vraies — celles de dix-huit minutes sur un
 * arrêt dur, qui sont précisément ce qu'on cherche.
 */
const PAUSE_MAXIMALE = 30 * 60_000;

const OUTILS_AGENT = new Set(["Agent", "Task"]);
/** Un `.md` cité dans une commande, et le chevron qui en ferait une écriture. */
const CHEMIN_MD = /(>\s*)?([\w./@-]+\.md)\b/g;

export interface FichierLu {
  /** Le nom du fichier seul : les commandes le citent tantôt absolu, tantôt relatif. */
  fichier: string;
  a: number;
}

export interface AppelAgent {
  agent: string;
  a: number;
  enFond: boolean;
}

/** Un segment de temps : `de` inclus, `a` exclu. */
export interface Intervalle {
  de: number;
  a: number;
}

export interface Session {
  id: string;
  titre: string | null;
  debut: number;
  fin: number;
  fichiersLus: FichierLu[];
  agents: AppelAgent[];
  /** La machine a rendu la main, l'humain a repris. */
  attentes: Intervalle[];
  /** Trous plus longs que `PAUSE_MAXIMALE` : retranchés, jamais additionnés. */
  pauses: Intervalle[];
  lignesIllisibles: number;
  /** Faux quand rien de connu n'a été trouvé : on le dit plutôt que de compter zéro. */
  reconnue: boolean;
}

/** Rend null si le fichier n'existe pas. Tout le reste se lit ou se compte. */
export function lireSession(chemin: string): Session | null {
  try {
    statSync(chemin);
  } catch {
    return null;
  }

  const id = basename(chemin, ".jsonl");
  const session: Session = {
    id,
    titre: null,
    debut: 0,
    fin: 0,
    fichiersLus: [],
    agents: [],
    attentes: [],
    pauses: [],
    lignesIllisibles: 0,
    reconnue: false,
  };
  let precedent = 0;

  for (const ligne of lignes(chemin)) {
    const objet = analyser(ligne);
    if (objet === null) {
      if (ligne.trim()) session.lignesIllisibles++;
      continue;
    }

    // Les sessions reprises recopient les titres de leur parent : on ne garde
    // que celui qui porte l'identifiant du fichier, et le dernier gagne.
    if (objet.type === "custom-title") {
      if (objet.sessionId === id && typeof objet.customTitle === "string") session.titre = objet.customTitle;
      continue;
    }

    if (!estUnTour(objet, id)) continue;
    const instant = Date.parse(String(objet.timestamp ?? ""));
    if (!Number.isFinite(instant)) continue;
    session.reconnue = true;
    if (!session.debut) session.debut = instant;
    session.fin = instant;

    // Un trou trop long est une pause, que l'humain reprenne la parole ou non :
    // une nuit passée sur une tâche de fond n'est pas du travail machine.
    if (precedent) {
      const trou = { de: precedent, a: instant };
      if (instant - precedent > PAUSE_MAXIMALE) session.pauses.push(trou);
      else if (objet.type === "user" && estTourHumain(objet)) session.attentes.push(trou);
    }
    if (objet.type === "assistant" && !objet.isSidechain) collecter(objet, instant, session);
    precedent = instant;
  }
  return session;
}

type Enregistrement = Record<string, unknown> & { type?: string; message?: { content?: unknown } };

function analyser(ligne: string): Enregistrement | null {
  try {
    const valeur = JSON.parse(ligne);
    return valeur && typeof valeur === "object" ? (valeur as Enregistrement) : null;
  } catch {
    return null;
  }
}

/**
 * Seuls les tours de parole mènent la pendule.
 *
 * ATTENTION — leçon payée. Une première version avançait l'horloge sur toute
 * ligne datée. Or `attachment` et `system` portent l'horodatage de leur
 * *capture*, rejoué tel quel des heures plus tard : sur les vraies
 * transcriptions, l'horloge reculait de seize heures, et le bond suivant
 * passait pour une pause. Deux séances sur douze rendaient « 0 minute de
 * durée, 171 minutes d'attente ».
 *
 * Deuxième garde : une session reprise emporte l'historique de son parent,
 * chaque ligne gardant son `sessionId` d'origine. On ne compte que les siennes,
 * et on reste tolérant quand le champ manque — il n'est pas garanti.
 */
function estUnTour(objet: Enregistrement, id: string): boolean {
  if (objet.type !== "assistant" && objet.type !== "user") return false;
  return typeof objet.sessionId !== "string" || objet.sessionId === id;
}

/**
 * Un vrai tour de parole, et pas une injection du système.
 *
 * Un résultat d'outil arrive aussi en `type: "user"`, mais son contenu est un
 * tableau de blocs. Restent les chaînes : les vraies, et celles que la machine
 * s'écrit à elle-même — `<task-notification>`, `<system-reminder>`,
 * `[Request interrupted…]`. Une balise ou un crochet en tête les trahit.
 */
function estTourHumain(objet: Enregistrement): boolean {
  if (objet.isSidechain || objet.isMeta) return false;
  const contenu = objet.message?.content;
  if (typeof contenu !== "string") return false;
  const texte = contenu.trimStart();
  return texte.length > 0 && !texte.startsWith("<") && !texte.startsWith("[");
}

function collecter(objet: Enregistrement, instant: number, session: Session): void {
  const contenu = objet.message?.content;
  if (!Array.isArray(contenu)) return;

  for (const bloc of contenu) {
    if (!bloc || bloc.type !== "tool_use") continue;
    const entree = (bloc.input ?? {}) as Record<string, unknown>;

    if (OUTILS_AGENT.has(bloc.name)) {
      session.agents.push({
        agent: typeof entree.subagent_type === "string" ? entree.subagent_type : "?",
        a: instant,
        enFond: entree.run_in_background === true,
      });
      continue;
    }
    for (const fichier of mdLus(bloc.name, entree)) session.fichiersLus.push({ fichier, a: instant });
  }
}

/**
 * Les `.md` qu'un appel d'outil **lit**.
 *
 * Une écriture n'est pas un passage : une session qui répare le workflow cite
 * ses étapes sans les exécuter. Le chevron de redirection suffit à écarter le
 * `cat > steps/…` ; le `Edit` et le `Write` ne sont pas regardés du tout.
 *
 * Restent les scripts de correction en ligne (`python3 - <<EOF` qui ouvre une
 * étape) : ils comptent à tort. C'est le prix du vocabulaire choisi — on dit
 * « franchie » ou « non observée », jamais « faite » ou « pas faite ».
 */
function mdLus(outil: unknown, entree: Record<string, unknown>): string[] {
  if (outil === "Read") {
    const chemin = entree.file_path;
    return typeof chemin === "string" && chemin.endsWith(".md") ? [basename(chemin)] : [];
  }
  if (outil !== "Bash" || typeof entree.command !== "string") return [];

  const trouves: string[] = [];
  for (const [, redirection, chemin] of entree.command.matchAll(CHEMIN_MD)) {
    if (!redirection) trouves.push(basename(chemin));
  }
  return trouves;
}

/**
 * Les lignes du fichier, une à une, sans jamais le charger en entier.
 *
 * Vingt-quatre sessions d'un seul projet pèsent 162 Mo ; `readFileSync` en
 * ferait autant en mémoire, doublé par le `split`. `StringDecoder` et non
 * `Buffer.toString` : un caractère accentué à cheval sur deux tampons se
 * perdrait, et les rôles d'étapes sont en français.
 */
function* lignes(chemin: string): Generator<string> {
  let fd: number;
  try {
    fd = openSync(chemin, "r");
  } catch {
    return;
  }

  const tampon = Buffer.allocUnsafe(TAMPON);
  const decodeur = new StringDecoder("utf8");
  let reste = "";

  try {
    let lus = 0;
    while ((lus = readSync(fd, tampon, 0, TAMPON, null)) > 0) {
      const morceaux = (reste + decodeur.write(tampon.subarray(0, lus))).split("\n");
      reste = morceaux.pop() ?? "";
      yield* morceaux;
    }
  } finally {
    closeSync(fd);
  }
  if (reste) yield reste;
}

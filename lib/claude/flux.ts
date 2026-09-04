/**
 * Ce que l'agent fait, pendant qu'il le fait.
 *
 * Orcha lançait le CLI en `--output-format text` : tout était mis en mémoire,
 * et l'écran n'affichait « Thinking… » que jusqu'à ce qu'un bloc de quatre
 * lignes tombe, dix secondes ou six minutes plus tard. On ne savait ni s'il
 * travaillait, ni ce qu'il avait ouvert, ni ce qu'il venait de réécrire — d'où
 * la réponse illisible : elle arrivait sans rien de ce qui l'avait produite.
 *
 * `--output-format stream-json` rend une ligne JSON par événement, au fil de
 * l'eau. Ce module en fait des **gestes** : le vocabulaire de l'écran, pas
 * celui du CLI. Il ne lance rien et n'ouvre aucun fichier — c'est une fonction
 * pure sur une chaîne, donc testable sur de vraies lignes capturées.
 *
 * Deux choses n'en sortent jamais. Le `tool_result`, parce qu'il recopie le
 * contenu lu — un `.jsonl` de session, une clé dans un fichier d'environnement.
 * Et le `thinking`, parce qu'il tient dix fois la place de la réponse dans un
 * panneau de trente rem. Ce qu'on garde, c'est le récit et l'acte.
 *
 * Avec `--include-partial-messages`, le texte arrive aussi mot à mot, dans des
 * `stream_event` : ce sont les **fragments**. Ils ne sont pas des gestes à
 * montrer dans la piste — ils font la réponse qui s'écrit sous les yeux.
 */

export type Sorte =
  | "note"
  | "fragment"
  | "lecture"
  | "recherche"
  | "ecriture"
  | "commande"
  | "delegation"
  | "outil"
  | "fin"
  | "echec";

export interface Geste {
  sorte: Sorte;
  /** Le texte d'une note, ou ce sur quoi le geste porte : fichier, motif, commande. */
  quoi: string;
  /** Écriture seulement : sans l'avant et l'après, « modifié » ne dit rien. */
  avant?: string;
  apres?: string;
}

/** Les outils qu'on nomme ; le reste tombe dans « outil », sans mentir. */
const SORTES: Record<string, Sorte> = {
  Read: "lecture",
  NotebookRead: "lecture",
  Glob: "recherche",
  Grep: "recherche",
  WebSearch: "recherche",
  WebFetch: "recherche",
  Edit: "ecriture",
  Write: "ecriture",
  NotebookEdit: "ecriture",
  Bash: "commande",
  BashOutput: "commande",
  // `Task` sur les CLI anciens, `Agent` depuis : les deux, pour une ligne.
  Agent: "delegation",
  Task: "delegation",
};

type Bloc = Record<string, unknown>;

/**
 * Une ligne du flux → zéro, un ou plusieurs gestes.
 *
 * Zéro est le cas courant — hooks, jetons de réflexion, initialisation. Une
 * ligne tronquée en rend zéro aussi : un `spawn` interrompu coupe en plein
 * milieu, et planter là-dessus perdrait tout ce que l'agent a déjà fait.
 */
export function lireGestes(ligne: string): Geste[] {
  const evenement = analyser(ligne);
  if (!evenement) return [];

  if (evenement.type === "result") {
    const texte = String(evenement.result ?? "");
    return [{ sorte: evenement.is_error ? "echec" : "fin", quoi: texte }];
  }
  if (evenement.type === "stream_event") return duFragment(evenement.event as Bloc | undefined);
  if (evenement.type !== "assistant") return [];

  const blocs = (evenement.message as Bloc | undefined)?.content;
  if (!Array.isArray(blocs)) return [];
  return blocs.map(duBloc).filter((g): g is Geste => g !== null);
}

function analyser(ligne: string): Bloc | null {
  if (ligne.trim() === "") return null;
  try {
    return JSON.parse(ligne) as Bloc;
  } catch {
    return null;
  }
}

/**
 * Un fragment de texte, tel quel — surtout pas de `trim` : c'est lui qui porte
 * l'espace entre deux mots. La réflexion a ses propres deltas et reste dehors,
 * pour la même raison que son bloc complet.
 */
function duFragment(evenement: Bloc | undefined): Geste[] {
  if (evenement?.type !== "content_block_delta") return [];
  const delta = evenement.delta as Bloc | undefined;
  if (delta?.type !== "text_delta") return [];
  const texte = String(delta.text ?? "");
  return texte === "" ? [] : [{ sorte: "fragment", quoi: texte }];
}

function duBloc(bloc: Bloc): Geste | null {
  if (bloc.type === "text") {
    const texte = String(bloc.text ?? "").trim();
    return texte === "" ? null : { sorte: "note", quoi: texte };
  }
  if (bloc.type !== "tool_use") return null;

  const entree = (bloc.input ?? {}) as Bloc;
  const sorte = SORTES[String(bloc.name)] ?? "outil";
  if (sorte === "ecriture") return uneEcriture(entree, String(bloc.name));
  return { sorte, quoi: cible(entree, String(bloc.name)) };
}

/**
 * `Write` remplace le fichier entier, `Edit` une portion : l'un a un « avant »
 * vide, l'autre non. Le distinguer ici évite à l'écran de le redemander.
 */
function uneEcriture(entree: Bloc, nom: string): Geste {
  return {
    sorte: "ecriture",
    quoi: String(entree.file_path ?? entree.notebook_path ?? nom),
    avant: String(entree.old_string ?? ""),
    apres: String(entree.new_string ?? entree.content ?? entree.new_source ?? ""),
  };
}

/** Le champ qui porte le sens, outil par outil. Le nom de l'outil en dernier recours. */
function cible(entree: Bloc, nom: string): string {
  const porteur =
    entree.file_path ?? entree.command ?? entree.pattern ?? entree.query ??
    entree.url ?? entree.subagent_type ?? entree.description ?? entree.notebook_path;
  return porteur === undefined ? nom : String(porteur);
}

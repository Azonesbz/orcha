/**
 * Le modèle affiché par l'interface.
 *
 * Un dossier .claude n'est pas un graphe : c'est un jeu de fichiers dont le
 * déclenchement dépend de champs de frontmatter et de règles de précédence.
 * Ces types décrivent ce qui est sur le disque, jamais une abstraction inventée.
 */

/** D'où vient un élément. Décide de la précédence et de ce qui est modifiable. */
export type Portee = "utilisateur" | "projet" | "plugin" | "intégré";

/** Pourquoi un élément présent sur le disque ne sera pas utilisé. */
export interface Silence {
  cause: string;
  detail: string;
}

export interface Base {
  nom: string;
  portee: Portee;
  origine: string;
  chemin: string;
  silences: Silence[];
}

export interface Competence extends Base {
  description: string;
  invocableParLeModele: boolean;
  invocableParLUtilisateur: boolean;
  outilsAutorises: string[];
  indiceArgument: string;
  corps: string;
  lignes: number;
}

/* Ce que dit un agent qui ne déclare ni `tools` ni `model`. Nommé plutôt que
   recopié, et rangé ici parce que ce fichier n'importe rien : un composant
   client peut le lire sans emporter `node:fs` dans le navigateur. */
export const OUTILS_HERITES = "hérités de la session";
export const MODELE_DE_SESSION = "celui de la session";

export interface Agent extends Base {
  description: string;
  outils: string;
  modele: string;
  corps: string;
}

export interface Commande extends Base {
  description: string;
  indiceArgument: string;
  corps: string;
}

export interface Hook {
  evenement: string;
  matcher: string;
  commande: string;
  delai: number;
  portee: Portee;
  origine: string;
  silences: Silence[];
}

export interface ReglePermission {
  decision: "allow" | "deny" | "ask";
  motif: string;
  portee: Portee;
  origine: string;
}

export interface Plugin {
  identifiant: string;
  marketplace: string;
  active: boolean;
  cheminInstallation: string;
  present: boolean;
  silences: Silence[];
}

/** Un plugin proposé par une marketplace mais jamais activé : il ne charge pas. */
export interface PluginAuCatalogue {
  identifiant: string;
  marketplace: string;
  competences: number;
  agents: number;
  commandes: number;
}

export interface FichierInstructions {
  chemin: string;
  portee: Portee;
  octets: number;
  lignes: number;
}

/** Tout ce qu'une lecture complète rapporte. */
export interface Atelier {
  racineUtilisateur: string;
  racineProjet: string | null;
  competences: Competence[];
  agents: Agent[];
  commandes: Commande[];
  hooks: Hook[];
  permissions: ReglePermission[];
  plugins: Plugin[];
  /** Le catalogue non activé, tenu à l'écart des listes ci-dessus. */
  catalogue: PluginAuCatalogue[];
  instructions: FichierInstructions[];
}

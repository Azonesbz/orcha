import { Entree, Liste, Panneau, Pastille } from "@/components/primitives";
import type { FichierInstructions, Hook, Plugin } from "@/lib/types";

/**
 * Les panneaux de réglages d'un `.codex` : plugins, hooks, instructions.
 *
 * Mêmes primitives que l'inventaire Claude, textes propres à Codex. Aucun
 * lien vers un écran de détail : ces fichiers ne se modifient pas depuis
 * Orcha, et un lien qui mène à un 404 vaut moins que pas de lien.
 */
export function Plugins({ plugins }: { plugins: Plugin[] }) {
  return (
    <Panneau
      titre="Plugins"
      compte={plugins.length}
      ecarts={plugins.filter((p) => p.silences.length).length}
      intro="Déclarés dans config.toml, copiés dans plugins/cache. Un plugin activé sans copie ne charge pas."
      vide="Aucun plugin déclaré dans config.toml."
    >
      <Liste>
        {plugins.map((p) => (
          <Entree
            key={p.identifiant}
            silences={p.silences}
            titre={
              <>
                <span className="font-medium">{p.identifiant}</span>
                <span className={`font-mono text-meta ${p.active ? "text-ink-soft" : "text-muted"}`}>
                  {p.active ? (p.present ? "chargé" : "absent du disque") : "désactivé"}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-meta text-muted">{p.cheminInstallation}</span>
              </>
            }
          />
        ))}
      </Liste>
    </Panneau>
  );
}

export function Hooks({ hooks }: { hooks: Hook[] }) {
  return (
    <Panneau
      titre="Hooks"
      compte={hooks.length}
      ecarts={hooks.filter((h) => h.silences.length).length}
      intro="Une commande lancée à un moment de la session — déclarée dans hooks.json, ou dans le bloc [hooks] de config.toml."
      vide="Aucun hook déclaré."
    >
      <Liste>
        {hooks.map((h, i) => (
          <Entree
            key={i}
            silences={h.silences}
            titre={
              <>
                <span className="font-medium">{h.evenement}</span>
                <Pastille portee={h.portee} origine={h.origine} />
                {h.matcher && <span className="font-mono text-meta text-muted">{h.matcher}</span>}
                <span className="min-w-0 flex-1 truncate font-mono text-meta">{h.commande}</span>
              </>
            }
          />
        ))}
      </Liste>
    </Panneau>
  );
}

export function Instructions({ instructions }: { instructions: FichierInstructions[] }) {
  return (
    <Panneau
      titre="Instructions"
      compte={instructions.length}
      intro="Les fichiers AGENTS.md chargés à chaque session : celui de ~/.codex, puis celui du projet."
      vide="Aucun AGENTS.md trouvé."
    >
      <Liste>
        {instructions.map((f) => (
          <Entree
            key={f.chemin}
            titre={
              <>
                <Pastille portee={f.portee} origine={f.portee === "utilisateur" ? "~/.codex" : "projet"} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{f.chemin}</span>
                <span className="font-mono text-meta text-muted">{f.lignes} lignes · {f.octets} octets</span>
              </>
            }
          />
        ))}
      </Liste>
    </Panneau>
  );
}

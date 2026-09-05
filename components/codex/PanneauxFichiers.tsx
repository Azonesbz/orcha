import { Entree, Liste, Panneau, Pastille } from "@/components/primitives";
import { MODELE_DE_SESSION, type Agent, type Commande, type Competence } from "@/lib/types";

/**
 * Les panneaux de fichiers d'un `.codex` : compétences, agents, prompts.
 *
 * Les noms ne sont pas des liens : les écrans de détail lisent le `.claude`,
 * et un agent TOML n'y a pas de page. Le chemin se lit au survol.
 */
export function Competences({ competences }: { competences: Competence[] }) {
  return (
    <Panneau
      titre="Compétences"
      compte={competences.length}
      ecarts={competences.filter((c) => c.silences.length).length}
      intro="Lues dans skills/ de .codex et de .agents. Une compétence présente aux deux endroits apparaît deux fois — Codex ne les fusionne pas."
      vide="Aucune compétence dans les dossiers skills/ lus."
    >
      <Liste>
        {competences.map((c) => (
          <Entree
            key={c.chemin}
            description={c.description}
            silences={c.silences}
            titre={
              <>
                <Nom nom={c.nom} chemin={c.chemin} />
                <Pastille portee={c.portee} origine={c.origine} />
                <span className="ml-auto font-mono text-meta text-muted">{c.lignes} lignes</span>
              </>
            }
          />
        ))}
      </Liste>
    </Panneau>
  );
}

export function Agents({ agents }: { agents: Agent[] }) {
  return (
    <Panneau
      titre="Agents"
      compte={agents.length}
      ecarts={agents.filter((a) => a.silences.length).length}
      intro="Un TOML par agent dans agents/. Codex le choisit d'après sa description, et lui donne ses developer_instructions pour consigne."
      vide="Aucun agent dans agents/."
    >
      <Liste>
        {agents.map((a) => (
          <Entree
            key={a.chemin}
            description={a.description}
            silences={a.silences}
            titre={
              <>
                <Nom nom={a.nom} chemin={a.chemin} />
                <Pastille portee={a.portee} origine={a.origine} />
                {a.modele !== MODELE_DE_SESSION && <span className="font-mono text-meta text-muted">{a.modele}</span>}
              </>
            }
          />
        ))}
      </Liste>
    </Panneau>
  );
}

export function Prompts({ prompts }: { prompts: Commande[] }) {
  return (
    <Panneau
      titre="Prompts"
      compte={prompts.length}
      ecarts={prompts.filter((p) => p.silences.length).length}
      intro="Ce que Claude Code appelle des commandes : un Markdown dans prompts/, tapé /prompts:<nom>."
      vide="Aucun prompt dans prompts/."
    >
      <Liste>
        {prompts.map((p) => (
          <Entree
            key={p.chemin}
            description={p.description}
            silences={p.silences}
            titre={
              <>
                <Nom nom={`/prompts:${p.nom}`} chemin={p.chemin} />
                <Pastille portee={p.portee} origine={p.origine} />
              </>
            }
          />
        ))}
      </Liste>
    </Panneau>
  );
}

function Nom({ nom, chemin }: { nom: string; chemin: string }) {
  return (
    <span className="font-mono text-section font-semibold" title={chemin}>
      {nom}
    </span>
  );
}

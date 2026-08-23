import { Entree, Liste, Pastille } from "@orcha/charte";

/**
 * Une entrée est une ligne de liste : titre libre, description tronquée à deux
 * lignes, et les écarts en dessous quand il y en a. Elle se compose toujours
 * dans une `Liste` — la montrer seule serait la montrer hors de son cadre.
 */
export function AvecPastille() {
  return (
    <Liste>
      <Entree
        titre={
          <>
            <span className="font-mono text-sm font-medium">grilling</span>
            <Pastille portee="utilisateur" origine="~/.claude/skills" />
            <span className="font-mono text-xs text-muted">168 lignes</span>
          </>
        }
        description="Passer au gril un plan ou une décision : interroger jusqu'à épuisement des questions."
      />
      <Entree
        titre={
          <>
            <span className="font-mono text-sm font-medium">idee</span>
            <Pastille portee="projet" origine=".claude/skills" />
            <span className="font-mono text-xs text-muted">94 lignes</span>
          </>
        }
        description="Capturer une idée de micro-SaaS dans le vault, sous forme de fiche."
      />
    </Liste>
  );
}

/** Une entrée qui porte un écart : la règle s'affiche sous la description. */
export function AvecEcart() {
  return (
    <Liste>
      <Entree
        titre={
          <>
            <span className="font-mono text-sm font-medium">relecteur</span>
            <Pastille portee="utilisateur" origine="~/.claude/agents" />
          </>
        }
        silences={[
          {
            cause: "agent sans description",
            detail:
              "Claude choisit un agent d'après sa description, et d'après elle seule. Sans description, il ne sera jamais appelé.",
          },
        ]}
      />
    </Liste>
  );
}

/** Sans description : la ligne se réduit à son titre. */
export function TitreSeul() {
  return (
    <Liste>
      <Entree
        titre={
          <>
            <span className="font-mono text-sm font-medium">Explore</span>
            <Pastille portee="intégré" origine="Claude Code" />
          </>
        }
      />
    </Liste>
  );
}

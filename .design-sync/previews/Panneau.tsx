import { Entree, Liste, Panneau, Pastille } from "@orcha/charte";

/**
 * Le panneau est le cadre d'une section de l'inventaire : un titre, un compte,
 * et le nombre d'écarts quand il y en a.
 *
 * Son comportement le plus intéressant est le cas vide : `compte === 0` remplace
 * les enfants par la phrase `vide`, qui dit **ce qu'on a regardé**. C'est
 * délibéré — « rien » ne doit jamais pouvoir se lire comme « cassé ».
 */
export function AvecContenu() {
  return (
    <Panneau titre="Compétences" compte={35} intro="Ce que Claude peut invoquer, et d'où ça vient.">
      <Liste>
        <Entree
          titre={
            <>
              <span className="font-mono text-sm font-medium">grilling</span>
              <Pastille portee="utilisateur" origine="~/.claude/skills" />
            </>
          }
          description="Interroger un plan jusqu'à épuisement des questions."
        />
        <Entree
          titre={
            <>
              <span className="font-mono text-sm font-medium">ui-snapping</span>
              <Pastille portee="plugin" origine="lp-builder" />
            </>
          }
          description="Assembler une page à partir de composants existants."
        />
      </Liste>
    </Panneau>
  );
}

/** Avec des écarts : le compte est doublé d'un décompte en rouge. */
export function AvecEcarts() {
  return (
    <Panneau titre="Agents" compte={32} ecarts={1}>
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
              detail: "Sans description, Claude ne l'appellera jamais.",
            },
          ]}
        />
      </Liste>
    </Panneau>
  );
}

/**
 * Le cas vide, et c'est le plus important : la phrase dit ce qui a été regardé,
 * pour que l'absence de résultat ne se lise pas comme une panne.
 */
export function Vide() {
  return (
    <Panneau
      titre="Hooks"
      compte={0}
      vide="Aucun hook déclaré dans settings.json ni settings.local.json."
    >
      <span />
    </Panneau>
  );
}

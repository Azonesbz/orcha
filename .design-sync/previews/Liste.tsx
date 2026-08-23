import { Entree, Liste, Pastille } from "@orcha/charte";

/**
 * La liste n'est qu'une carte qui contient des entrées — son intérêt est le
 * filet qui les sépare, et l'absence de filet sous la dernière.
 */
export function TroisEntrees() {
  const lignes = [
    { nom: "clean-code", portee: "plugin" as const, ou: "dev-methodology", desc: "Règles de code propre au niveau fonction et ligne." },
    { nom: "market-blueprint", portee: "plugin" as const, ou: "lp-builder", desc: "Analyse concurrentielle d'une niche, puis blueprint de conversion." },
    { nom: "lancer", portee: "utilisateur" as const, ou: "~/.claude/skills", desc: "Passer d'une fiche à un dépôt qui tourne, en une passe." },
  ];

  return (
    <Liste>
      {lignes.map((l) => (
        <Entree
          key={l.nom}
          titre={
            <>
              <span className="font-mono text-sm font-medium">{l.nom}</span>
              <Pastille portee={l.portee} origine={l.ou} />
            </>
          }
          description={l.desc}
        />
      ))}
    </Liste>
  );
}

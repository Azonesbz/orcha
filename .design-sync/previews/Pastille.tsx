import { Pastille } from "@orcha/charte";

/**
 * Les quatre portées, côte à côte.
 *
 * C'est l'axe qui fait varier le composant : chaque portée a sa couleur ET sa
 * phrase d'explication en `title`. Les montrer ensemble est la seule façon de
 * voir que `plugin` et `intégré` se distinguent — c'est précisément ce qui
 * avait manqué quand la couleur portait seule l'information.
 */
export function Portees() {
  return (
    <div className="flex flex-wrap gap-2">
      <Pastille portee="utilisateur" origine="~/.claude/skills" />
      <Pastille portee="projet" origine="Ai-Giva/.claude" />
      <Pastille portee="plugin" origine="lp-builder@claude-config" />
      <Pastille portee="intégré" origine="Claude Code" />
    </div>
  );
}

/** Une origine longue est tronquée plutôt que de casser la ligne. */
export function OrigineLongue() {
  return (
    <Pastille
      portee="plugin"
      origine="dev-methodology@claude-config/283aa4b48769/skills"
    />
  );
}

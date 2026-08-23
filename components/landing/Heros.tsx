import { AppelPrincipal, AppelSecondaire, Reducteurs } from "./Appel";
import { Cadre, Tete } from "./EcranCadre";
import { ECARTS } from "./EcranEcarts";
import { Pastille, Silences } from "@/components/primitives";

/**
 * Le premier écran : la panne d'abord, l'outil ensuite.
 *
 * Le lecteur arrive sans doute sur son dossier `.claude` — lui vendre un
 * « inventaire » ne lui dit rien. Lui montrer que Claude Code accepte en
 * silence ce qui ne charge pas lui dit tout, et rend l'inventaire nécessaire.
 * D'où cet ordre, et le visuel qui montre la soustraction plutôt que le produit.
 */

/** Ce qui charge, avec l'endroit d'où ça vient. La somme des lignes fait 147. */
const CHARGE: Array<{ quoi: string; ou: string; combien: number }> = [
  { quoi: "compétences", ou: "~/.claude/skills", combien: 35 },
  { quoi: "agents", ou: "~/.claude/agents", combien: 32 },
  { quoi: "commandes", ou: "~/.claude/commands", combien: 30 },
  { quoi: "règles de permission", ou: "settings.json", combien: 40 },
  { quoi: "hooks", ou: "settings.json", combien: 6 },
  { quoi: "plugins", ou: "installed_plugins.json", combien: 3 },
  { quoi: "instructions", ou: "./CLAUDE.md", combien: 1 },
];

export function Heros() {
  return (
    <section className="scroll-mt-4">
      <p className="surtitre">// CLAUDE CODE</p>

      <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-semibold text-balance sm:text-4xl">
        Ton <code>.claude</code> déclare des choses qui ne tournent plus.
      </h1>

      <p className="mt-5 max-w-2xl text-base text-ink-soft sm:text-lg">
        Un plugin déclaré actif dont le code a disparu du disque. Un agent sans description. Une
        étape de workflow dont le fichier manque. Claude Code les accepte en silence — aucun
        avertissement, code de retour 0. <span className="font-semibold">Orcha</span> fait la
        soustraction entre ce que tu as déclaré et ce qui charge vraiment.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <AppelPrincipal />
        <AppelSecondaire />
      </div>
      <Reducteurs />

      <div className="mt-10">
        <InventaireRejoue />
      </div>
    </section>
  );
}

/**
 * La soustraction, en deux colonnes : ce qui charge, ce qui ne fait rien.
 *
 * L'étiquette dit « exemple » et non « inventaire » : sans ce mot, les nombres
 * du cadre se lisent comme une statistique d'usage du produit. Ce sont ceux
 * d'une machine, rejoués pour montrer la forme du résultat.
 */
function InventaireRejoue() {
  return (
    <Cadre chemin="~/.claude · ./CLAUDE.md" etiquette="inventaire — exemple">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Tete titre="Charge" compte={147} ton="text-ink" />
          <ul className="text-sm">
            {CHARGE.map((ligne) => (
              <li
                key={ligne.quoi}
                className="flex items-baseline gap-2 border-b border-line py-1.5 last:border-0"
              >
                <span className="text-ink-soft">{ligne.quoi}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
                  {ligne.ou}
                </span>
                <span className="font-mono tabular-nums">{ligne.combien}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:border-l sm:border-line sm:pl-6">
          <Tete titre="Sans effet" compte={ECARTS.length} ton="text-danger" />
          <ul>
            {ECARTS.map((ecart) => (
              <li key={ecart.nom} className="border-b border-line py-2 last:border-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-xs font-medium">{ecart.nom}</span>
                  <Pastille portee={ecart.portee} origine={ecart.origine} />
                </div>
                <Silences silences={[{ cause: ecart.regle, detail: ecart.detail }]} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Cadre>
  );
}

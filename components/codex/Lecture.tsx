import { PastillePortee, Silences } from "@/components/primitives";
import type { AtelierCodex } from "@/lib/lecture/codex/atelier";
import { projetApprouve } from "@/lib/lecture/codex/config";

/**
 * Ce qu'Orcha lit de Codex, et dans quel état.
 *
 * Deux dossiers, comme pour Claude Code — mais le second peut manquer sans
 * que rien ne cloche : un projet qui n'a pas encore de `.codex` est un projet
 * à convertir, pas un projet cassé. La ligne de config situe une session
 * en quatre mots ; le reste de `config.toml` n'a pas d'effet silencieux.
 */
export function Lecture({ atelier }: { atelier: AtelierCodex }) {
  const { config } = atelier;
  const approuve = atelier.dossierProjet ? projetApprouve(config, atelier.dossierProjet) : false;

  return (
    <section className="card mb-5 px-6 py-[22px]">
      <span className="text-module font-semibold">Lecture</span>
      <p className="mt-1.5 mb-3.5 text-description text-muted">
        Les dossiers que Codex charge. Orcha les lit ; il n&apos;y écrit que par la conversion ci-dessous.
      </p>
      <div className="flex flex-col gap-2">
        <Racine portee="utilisateur" chemin={atelier.racineUtilisateur} />
        <Racine
          portee="projet"
          chemin={atelier.racineProjet}
          absent={atelier.dossierProjet ? `${atelier.dossierProjet}/.codex — pas encore créé` : "aucun projet lu"}
        />
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
        <Reglage nom="modèle" valeur={config.modele} />
        <Reglage nom="approbation" valeur={config.approbation} />
        <Reglage nom="bac à sable" valeur={config.bacASable} />
        {/* Le rouge n'a de sens que si un .codex existe : sans lui, rien n'est ignoré. */}
        {atelier.dossierProjet && (
          <Reglage nom="ce projet" valeur={approuve ? "approuvé" : "non approuvé"} alerte={!approuve && atelier.racineProjet !== null} />
        )}
      </dl>
      <p className="mt-2 font-mono text-meta text-muted">{config.chemin}{config.presente ? "" : " — absent"}</p>

      <Silences silences={atelier.silences} />
    </section>
  );
}

function Racine({ portee, chemin, absent }: { portee: "utilisateur" | "projet"; chemin: string | null; absent?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-controle border border-line bg-paper px-3.5 py-2.5">
      <PastillePortee portee={portee}>{portee}</PastillePortee>
      <span className={`min-w-0 truncate font-mono text-meta-lg ${chemin ? "text-ink" : "text-muted"}`}>
        {chemin ?? absent}
      </span>
    </div>
  );
}

/** Une valeur vide se dit « par défaut » : Codex a un défaut pour chacune. */
function Reglage({ nom, valeur, alerte }: { nom: string; valeur: string; alerte?: boolean }) {
  return (
    <div>
      <dt className="etiquette mb-[3px]">{nom}</dt>
      <dd className={`font-mono text-meta-lg ${alerte ? "text-danger" : valeur ? "text-ink" : "text-muted"}`}>
        {valeur || "par défaut"}
      </dd>
    </div>
  );
}

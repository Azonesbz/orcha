"use client";

import { useState } from "react";
import { Icone, type NomIcone } from "@/components/icones";
import { Prose } from "@/components/agent/Prose";
import type { Geste, Sorte } from "@/lib/claude/flux";

/**
 * Ce que l'agent fait, pendant qu'il le fait.
 *
 * C'était le manque : « Thinking… » pendant six minutes, puis quatre lignes.
 * On ne savait ni s'il travaillait, ni ce qu'il avait ouvert, ni ce qu'il
 * venait de réécrire — donc on ne relançait plus l'outil.
 *
 * La piste se replie une fois la réponse arrivée. Le fil se lit alors comme
 * avant, et la preuve reste à un clic : douze gestes dépliés au-dessus de
 * chaque réponse rendraient la discussion illisible au troisième tour.
 */

const VERBES: Partial<Record<Sorte, { verbe: string; icone: NomIcone }>> = {
  lecture: { verbe: "lu", icone: "oeil" },
  recherche: { verbe: "cherché", icone: "chercher" },
  ecriture: { verbe: "écrit", icone: "editer" },
  commande: { verbe: "lancé", icone: "commande" },
  delegation: { verbe: "délégué", icone: "agents" },
  outil: { verbe: "outil", icone: "a-la-main" },
};

export function Piste({ gestes, enCours }: { gestes: Geste[]; enCours: boolean }) {
  const [deplie, setDeplie] = useState(false);

  // Le CLI met quelques secondes à démarrer avant son premier geste. Sans ce
  // signe, l'écran est vide et l'envoi a l'air d'avoir échoué.
  if (gestes.length === 0) {
    if (!enCours) return null;
    return <p className="shimmer font-mono text-meta text-muted">l&apos;agent démarre…</p>;
  }

  // Pendant le travail, tout est ouvert : c'est la seule chose à regarder.
  if (enCours || deplie) {
    return (
      <div className="flex flex-col gap-1.5 border-l border-line-soft pl-3">
        {!enCours && <Repli onClic={() => setDeplie(false)} />}
        {gestes.map((geste, i) => (
          <Ligne key={i} geste={geste} />
        ))}
      </div>
    );
  }
  return <Resume gestes={gestes} onClic={() => setDeplie(true)} />;
}

function Ligne({ geste }: { geste: Geste }) {
  // La note passe par le même rendu que la réponse : l'agent y écrit du
  // Markdown, et le laisser brut affichait des « ## » pendant deux secondes
  // avant que la réponse ne se pose en dessous, proprement rendue.
  if (geste.sorte === "note") return <Prose>{geste.quoi}</Prose>;

  const dit = VERBES[geste.sorte];
  if (!dit) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline gap-1.5 font-mono text-meta text-muted">
        <span className="shrink-0 translate-y-0.5 text-faint">
          <Icone nom={dit.icone} taille={11} />
        </span>
        <span className="shrink-0">{dit.verbe}</span>
        <span className="truncate text-ink-soft" title={geste.quoi}>
          {geste.sorte === "lecture" || geste.sorte === "ecriture" ? court(geste.quoi) : geste.quoi}
        </span>
      </p>
      {geste.sorte === "ecriture" && <Ecart avant={geste.avant ?? ""} apres={geste.apres ?? ""} />}
    </div>
  );
}

/**
 * Ce qui change, montré et non raconté.
 *
 * C'est ce qui manquait le plus : l'agent disait « modifié SKILL.md » et il
 * fallait aller rouvrir le fichier pour savoir quoi. Le flux porte l'avant et
 * l'après de chaque écriture — les afficher ne coûte rien de plus.
 */
function Ecart({ avant, apres }: { avant: string; apres: string }) {
  return (
    <pre className="ml-4 overflow-x-auto rounded-controle border border-line bg-paper px-2.5 py-1.5 font-mono text-[10.5px] leading-[1.65]">
      {lignesDe(avant).map((l, i) => (
        <div key={`-${i}`} className="text-danger">
          − {l}
        </div>
      ))}
      {lignesDe(apres).map((l, i) => (
        <div key={`+${i}`} className="text-ink">
          + {l}
        </div>
      ))}
    </pre>
  );
}

function Resume({ gestes, onClic }: { gestes: Geste[]; onClic: () => void }) {
  const ecrits = new Set(gestes.filter((g) => g.sorte === "ecriture").map((g) => g.quoi));
  const actes = gestes.filter((g) => g.sorte !== "note").length;
  return (
    <button
      type="button"
      onClick={onClic}
      className="w-fit font-mono text-meta text-faint underline underline-offset-[3px] hover:text-muted"
    >
      {actes} geste{actes > 1 ? "s" : ""}
      {ecrits.size > 0 && ` · ${ecrits.size} fichier${ecrits.size > 1 ? "s" : ""} écrit${ecrits.size > 1 ? "s" : ""}`}
    </button>
  );
}

function Repli({ onClic }: { onClic: () => void }) {
  return (
    <button
      type="button"
      onClick={onClic}
      className="w-fit font-mono text-meta text-faint underline underline-offset-[3px] hover:text-muted"
    >
      replier
    </button>
  );
}

/** Au-delà, le diff prend plus de place que la discussion qu'il documente. */
const LIGNES_MAXIMALES = 8;

function lignesDe(texte: string): string[] {
  if (texte.trim() === "") return [];
  const toutes = texte.split("\n");
  if (toutes.length <= LIGNES_MAXIMALES) return toutes;
  return [...toutes.slice(0, LIGNES_MAXIMALES), `… ${toutes.length - LIGNES_MAXIMALES} lignes de plus`];
}

/**
 * Un chemin absolu tient sur trois lignes dans un panneau de trente rem, et ce
 * qui l'identifie est au bout. On garde le dossier et le fichier — assez pour
 * distinguer deux `SKILL.md`, assez court pour tenir sur une ligne.
 *
 * Réservé aux chemins : appliqué à une commande, il en gardait la fin —
 * `find "…/skills/demo-flow" -type f | sort` devenait `demo-flow" -type f |
 * sort`, où le verbe a disparu. Une commande se lit par son début, et `truncate`
 * coupe déjà la queue.
 */
function court(quoi: string): string {
  if (!quoi.includes("/")) return quoi;
  return quoi.split("/").slice(-2).join("/");
}

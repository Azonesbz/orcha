"use client";

import { useActionState } from "react";
import { choisirProjet, type RetourProjet } from "@/app/actions-projet";
import type { ProjetConnu } from "@/lib/lecture/projets";

const VIERGE: RetourProjet = { etat: "vierge", message: "" };

/**
 * Le choix du projet regardé.
 *
 * La liste vient des projets où Claude Code a réellement travaillé, lus dans
 * le `cwd` de leurs transcriptions — jamais deviné depuis le nom de dossier,
 * qui est ambigu.
 */
export function ChoixProjet({
  connus,
  actuel,
  impose,
}: {
  connus: ProjetConnu[];
  actuel: string | null;
  impose: string | null;
}) {
  const [retour, action, enCours] = useActionState(choisirProjet, VIERGE);

  if (impose) {
    return (
      <p className="ml-auto max-w-[38ch] font-mono text-meta text-muted">
        projet imposé par <code>ATELIER_PROJET={impose}</code> — relance sans cette variable pour
        pouvoir en choisir un autre.
      </p>
    );
  }

  return (
    <form action={action} className="ml-auto flex flex-wrap items-center gap-2">
      <label>
        <span className="sr-only">Projet à regarder</span>
        {/* `key` force le remontage après un changement : sur un <select> non
            contrôlé, React ne réapplique pas `defaultValue` au re-rendu, et le
            sélecteur restait sur « détecter » alors qu'un projet était choisi. */}
        <select
          key={actuel ?? "auto"}
          name="projet"
          defaultValue={actuel ?? ""}
          className="max-w-[28rem] rounded-lg border border-line-strong bg-surface px-2.5 py-[7px] font-mono text-meta-lg text-ink"
        >
          <option value="">— détecter depuis le dossier de lancement —</option>
          {connus.map((p) => (
            <option key={p.chemin} value={p.chemin}>
              {p.chemin}
            </option>
          ))}
          {actuel && !connus.some((p) => p.chemin === actuel) && (
            <option value={actuel}>{actuel}</option>
          )}
        </select>
      </label>
      <button
        type="submit"
        disabled={enCours}
        className="rounded-lg bg-accent px-3.5 py-2 text-note font-semibold text-paper transition-colors hover:bg-accent-soft disabled:opacity-45"
      >
        {enCours ? "Lecture…" : "Regarder ce projet"}
      </button>
      {retour.etat !== "vierge" && (
        <span
          role={retour.etat === "refuse" ? "alert" : "status"}
          className={`font-mono text-meta ${retour.etat === "fait" ? "text-accent-soft" : "text-danger"}`}
        >
          {retour.message}
        </span>
      )}
    </form>
  );
}

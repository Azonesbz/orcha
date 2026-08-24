"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icone } from "@/components/icones";
import { Modale } from "@/components/Modale";
import {
  annuler,
  demander,
  lireContexte,
  type ApercuContexte,
  type RetourAgent,
} from "@/app/(local)/actions-agent";

const VIERGE: RetourAgent = { etat: "vierge", texte: "", instantane: "", dossier: "" };

/**
 * L'agent, sur tous les écrans.
 *
 * Il déduit son contexte de la route plutôt que de le recevoir en props : la
 * coquille ne peut pas connaître le contexte des pages, et le recalculer côté
 * serveur évite de faire voyager un inventaire — ou un fichier entier — jusqu'au
 * navigateur pour le renvoyer aussitôt.
 */
export function Agent() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [contexte, setContexte] = useState<ApercuContexte | null>(null);
  const [instruction, setInstruction] = useState("");
  const [retour, action, enCours] = useActionState(demander, VIERGE);

  // Le contexte se relit à chaque ouverture : l'écran a pu changer entre deux.
  useEffect(() => {
    if (ouvert) lireContexte(chemin).then(setContexte);
  }, [ouvert, chemin]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="btn-primary fixed right-6 bottom-6 z-50 shadow-lg"
      >
        <Icone nom="proposer" taille={15} />
        Ask agent
      </button>

      <Modale
        ouverte={ouvert}
        onFermer={() => setOuvert(false)}
        titre="Ask agent"
        aide={contexte ? `Il regarde : ${contexte.titre}` : "Lecture du contexte…"}
      >
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="chemin" value={chemin} />

          {contexte && !contexte.peutEcrire && (
            <p className="rounded-controle border border-line-soft px-3 py-2 font-mono text-meta text-muted">
              lecture seule ici — un plugin ne se modifie pas depuis Orcha
            </p>
          )}

          {contexte && contexte.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contexte.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInstruction(s)}
                  className="rounded-full border border-line-soft px-3 py-1.5 text-[11.5px] text-ink-soft transition-colors hover:border-accent/40 hover:text-accent-soft"
                >
                  {s.trim()}
                </button>
              ))}
            </div>
          )}

          <textarea
            name="instruction"
            rows={3}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Décris ce que tu veux savoir, ou ce qu'il faut changer."
            className="field resize-y text-note leading-[1.6]"
          />

          <div className="flex items-center gap-3">
            <button type="submit" disabled={enCours} className="btn-primary">
              <Icone nom="proposer" taille={14} />
              {enCours ? "L'agent travaille…" : "Demander"}
            </button>
            {contexte?.peutEcrire && (
              <span className="font-mono text-meta text-muted">
                il peut écrire — un instantané est pris avant
              </span>
            )}
          </div>

          {retour.etat !== "vierge" && <Reponse retour={retour} />}
        </form>
      </Modale>
    </>
  );
}

function Reponse({ retour }: { retour: RetourAgent }) {
  const [remis, action] = useActionState(annuler, VIERGE);
  const instantane = remis.etat === "vierge" ? retour.instantane : "";

  return (
    <>
      <pre
        className={`max-h-80 overflow-auto rounded-controle border px-3.5 py-3 font-mono text-meta leading-[1.7] break-words whitespace-pre-wrap ${
          retour.etat === "refuse"
            ? "border-danger/30 bg-danger-wash text-danger"
            : "border-line bg-paper text-ink-soft"
        }`}
      >
        {remis.texte || retour.texte}
      </pre>

      {/* Le filet : l'agent a écrit sans relecture, on garde le chemin du retour. */}
      {instantane && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            formAction={action}
            name="instantane"
            value={instantane}
            className="btn-secondary min-h-0 px-3.5 py-2 text-description"
          >
            <Icone nom="retour" taille={13} />
            revenir à l&apos;état d&apos;avant
          </button>
          <span className="font-mono text-meta text-muted">{retour.dossier}</span>
        </div>
      )}
    </>
  );
}

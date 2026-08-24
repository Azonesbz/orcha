"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icone } from "@/components/icones";
import { Modale } from "@/components/Modale";
import { Fil, type Tour } from "@/components/agent/Fil";
import {
  demander,
  lireContexte,
  type ApercuContexte,
  type RetourAgent,
} from "@/app/(local)/actions-agent";

const VIERGE: RetourAgent = { etat: "vierge", texte: "", instantane: "", dossier: "", session: "" };

/**
 * L'agent, sur tous les écrans — et en conversation.
 *
 * Il déduit son contexte de la route plutôt que de le recevoir en props : la
 * coquille ne peut pas connaître le contexte des pages, et le recalculer côté
 * serveur évite de faire voyager un fichier entier jusqu'au navigateur pour le
 * renvoyer aussitôt.
 *
 * L'historique n'est stocké nulle part ici : c'est le CLI qui tient la
 * conversation, par son identifiant de session. Le fil affiché n'est que le
 * reflet de ce qui a été dit.
 */
export function Agent() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [contexte, setContexte] = useState<ApercuContexte | null>(null);
  const [instruction, setInstruction] = useState("");
  const [fil, setFil] = useState<Tour[]>([]);
  const [retour, action, enCours] = useActionState(demander, VIERGE);
  const dernier = useRef("");

  useEffect(() => {
    if (ouvert) lireContexte(chemin).then(setContexte);
  }, [ouvert, chemin]);

  // Changer d'écran change le contexte : la conversation d'avant ne le suit pas.
  useEffect(() => {
    setFil([]);
    dernier.current = "";
  }, [chemin]);

  // Le retour d'action arrive hors du fil : on l'y verse une fois, et une seule.
  useEffect(() => {
    const cle = `${retour.session}:${retour.texte}`;
    if (retour.etat === "vierge" || cle === dernier.current) return;
    dernier.current = cle;
    setFil((f) => [
      ...f,
      {
        qui: "agent",
        texte: retour.texte,
        echec: retour.etat === "refuse",
        instantane: retour.instantane,
        dossier: retour.dossier,
      },
    ]);
  }, [retour]);

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
        large
        titre="Ask agent"
        aide={contexte ? `Il regarde : ${contexte.titre}` : "Lecture du contexte…"}
      >
        <form
          action={(donnees) => {
            const dit = String(donnees.get("instruction") ?? "").trim();
            if (dit) setFil((f) => [...f, { qui: "moi", texte: dit }]);
            setInstruction("");
            action(donnees);
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="chemin" value={chemin} />
          <input type="hidden" name="session" value={retour.session} />

          {contexte && !contexte.peutEcrire && (
            <p className="rounded-controle border border-line-soft px-3 py-2 font-mono text-meta text-muted">
              lecture seule ici — un plugin ne se modifie pas depuis Orcha
            </p>
          )}

          <Fil tours={fil} enCours={enCours} session={retour.session} />

          {fil.length === 0 && contexte && (
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
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={fil.length ? "Continue la discussion…" : "Ce que tu veux savoir, ou changer."}
            className="field resize-y text-note leading-[1.6]"
          />

          <div className="flex items-center gap-3">
            <button type="submit" disabled={enCours} className="btn-primary">
              <Icone nom="proposer" taille={14} />
              <span className={enCours ? "shimmer" : undefined}>
                {enCours ? "L'agent réfléchit…" : fil.length ? "Envoyer" : "Demander"}
              </span>
            </button>
            {contexte?.peutEcrire && (
              <span className="font-mono text-meta text-muted">
                il peut écrire — un instantané est pris avant
              </span>
            )}
          </div>
        </form>
      </Modale>
    </>
  );
}

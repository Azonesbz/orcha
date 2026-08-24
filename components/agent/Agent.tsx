"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icone } from "@/components/icones";
import { Fil, type Tour } from "@/components/agent/Fil";
import {
  demander,
  lireContexte,
  type ApercuContexte,
  type RetourAgent,
} from "@/app/(local)/actions-agent";

const VIERGE: RetourAgent = { etat: "vierge", texte: "", instantane: "", dossier: "", session: "" };
const MEMOIRE = "orcha.agent.fil";

interface Garde {
  session: string;
  tours: Tour[];
}

/**
 * L'agent : un fil de discussion, pas une boîte de dialogue.
 *
 * Trois choix qui font la différence entre les deux. Le panneau est posé à
 * côté et non par-dessus — on lit l'écran pendant qu'on en parle, ce qu'une
 * `<dialog>` modale interdit. Le fil survit à la navigation ET au
 * rechargement. Et changer d'écran ne le vide pas : on dit à l'agent où on
 * regarde maintenant, comme à quelqu'un qui suit par-dessus notre épaule.
 *
 * Ce qui est gardé au navigateur est le reflet de la discussion, pas la
 * discussion elle-même : c'est le CLI qui la tient, par son identifiant de
 * session. On garde donc l'identifiant et l'affichage, jamais l'historique.
 */
export function Agent() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [contexte, setContexte] = useState<ApercuContexte | null>(null);
  const [instruction, setInstruction] = useState("");
  const [tours, setTours] = useState<Tour[]>([]);
  const [session, setSession] = useState("");
  const [retour, action, enCours] = useActionState(demander, VIERGE);
  const dernierRendu = useRef("");
  const cheminDitALAgent = useRef("");

  // Relu une fois au montage : le fil doit survivre à un rechargement, sinon
  // ce n'est pas une discussion, c'est une suite de questions.
  useEffect(() => {
    try {
      const garde = localStorage.getItem(MEMOIRE);
      if (!garde) return;
      const lu: Garde = JSON.parse(garde);
      setSession(lu.session ?? "");
      setTours(lu.tours ?? []);
    } catch {
      // Une mémoire abîmée n'empêche pas de discuter : on repart à vide.
    }
  }, []);

  useEffect(() => {
    if (!session && tours.length === 0) return;
    localStorage.setItem(MEMOIRE, JSON.stringify({ session, tours } satisfies Garde));
  }, [session, tours]);

  useEffect(() => {
    if (ouvert) lireContexte(chemin).then(setContexte);
  }, [ouvert, chemin]);

  // Le retour d'action arrive hors du fil : on l'y verse une fois, et une seule.
  useEffect(() => {
    const cle = `${retour.session}:${retour.texte}`;
    if (retour.etat === "vierge" || cle === dernierRendu.current) return;
    dernierRendu.current = cle;
    if (retour.session) setSession(retour.session);
    setTours((f) => [
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
      {/* Le déclencheur s'efface quand le panneau est là : la croix de l'en-tête
          ferme, et un bouton posé par-dessus le fil gênerait la lecture. */}
      {!ouvert && (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          aria-expanded={false}
          className="btn-primary fixed right-6 bottom-6 z-50 shadow-lg"
        >
          <Icone nom="proposer" taille={15} />
          Ask agent
          {tours.length > 0 && (
            <span className="rounded-full bg-paper/20 px-1.5 font-mono text-meta">
              {tours.length}
            </span>
          )}
        </button>
      )}

      {/* Posé à côté, jamais par-dessus : on lit l'écran pendant qu'on en parle. */}
      <aside
        aria-label="Discussion avec l'agent"
        className={`fixed top-0 right-0 z-40 flex h-dvh w-[min(30rem,100vw)] flex-col border-l border-line bg-surface transition-transform duration-200 ${
          ouvert ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="mt-0.5 text-accent">
            <Icone nom="proposer" taille={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-section font-semibold">Discussion</h2>
            <p className="mt-0.5 truncate font-mono text-meta text-muted">
              {contexte ? `il regarde : ${contexte.titre}` : "lecture du contexte…"}
            </p>
          </div>
          {tours.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTours([]);
                setSession("");
                localStorage.removeItem(MEMOIRE);
              }}
              className="shrink-0 font-mono text-meta text-muted underline underline-offset-[3px] hover:text-ink"
            >
              repartir de zéro
            </button>
          )}
          <button
            type="button"
            onClick={() => setOuvert(false)}
            aria-label="Fermer la discussion"
            className="btn-ghost min-h-0 shrink-0 px-1.5 py-1"
          >
            <Icone nom="fermer" taille={16} />
          </button>
        </header>

        <form
          action={(donnees) => {
            const dit = String(donnees.get("instruction") ?? "").trim();
            if (!dit) return;
            setTours((f) => [...f, { qui: "moi", texte: dit }]);
            setInstruction("");
            cheminDitALAgent.current = chemin;
            action(donnees);
          }}
          className="flex min-h-0 flex-1 flex-col gap-3 p-5"
        >
          <input type="hidden" name="chemin" value={chemin} />
          <input type="hidden" name="session" value={session} />
          {/* L'agent n'a besoin du contexte que la première fois, et à chaque
              fois qu'on change d'écran. Le renvoyer à chaque tour gonflerait
              l'invite et lui ferait relire ce qu'il sait déjà. */}
          <input
            type="hidden"
            name="contexteNeuf"
            value={cheminDitALAgent.current === chemin ? "0" : "1"}
          />

          {contexte && !contexte.peutEcrire && (
            <p className="shrink-0 rounded-controle border border-line-soft px-3 py-2 font-mono text-meta text-muted">
              lecture seule ici — un plugin ne se modifie pas depuis Orcha
            </p>
          )}

          <Fil tours={tours} session={session} />

          {tours.length === 0 && contexte && (
            <div className="flex shrink-0 flex-wrap gap-2">
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

          {/* L'état de l'agent s'annonce ici, entre le fil et le champ : ce
              n'est pas un tour de parole, ça n'a rien à faire dans le fil. */}
          {enCours && (
            <div className="shrink-0 rounded-controle border border-accent/25 bg-accent/5 px-3.5 py-2.5">
              <p className="shimmer font-mono text-meta">
                {contexte?.peutEcrire
                  ? "l'agent lit, réfléchit, et peut modifier des fichiers…"
                  : "l'agent lit et réfléchit…"}
              </p>
            </div>
          )}

          {/* Le bouton vit dans le champ : une messagerie n'a pas de bouton
              posé à côté, elle a une flèche au bord de la zone de saisie. */}
          <div className="relative shrink-0">
            <textarea
              name="instruction"
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                // Entrée envoie, Maj+Entrée passe à la ligne — l'habitude de
                // toute messagerie, et de celle-ci.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={
                tours.length ? "Réponds, ou demande autre chose…" : "Ce que tu veux savoir, ou changer."
              }
              className="field resize-none py-3 pr-14 text-note leading-[1.6]"
            />
            <button
              type="submit"
              disabled={enCours || instruction.trim() === ""}
              aria-label="Envoyer"
              className="btn-primary absolute right-2.5 bottom-2.5 min-h-0 size-9 px-0"
            >
              <Icone nom="envoyer" taille={16} trait={2} />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

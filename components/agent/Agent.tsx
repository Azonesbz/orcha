"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icone } from "@/components/icones";
import { Fil } from "@/components/agent/Fil";
import { ecouterLesAppels } from "@/components/agent/appel";
import { useConversation } from "@/components/agent/conversation";
import { lireContexte, type ApercuContexte } from "@/app/(local)/actions-agent";

/**
 * L'agent : un fil de discussion, pas une boîte de dialogue.
 *
 * Trois choix qui font la différence entre les deux. Le panneau est posé à
 * côté et non par-dessus — on lit l'écran pendant qu'on en parle, ce qu'une
 * `<dialog>` modale interdit. Le fil survit à la navigation ET au
 * rechargement. Et changer d'écran ne le vide pas : on dit à l'agent où on
 * regarde maintenant, comme à quelqu'un qui suit par-dessus notre épaule.
 *
 * L'état de la discussion vit dans `useConversation` ; ce fichier pose l'écran.
 */
export function Agent() {
  const chemin = usePathname();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [contexte, setContexte] = useState<ApercuContexte | null>(null);
  const [instruction, setInstruction] = useState("");
  const { tours, enCours, suite, envoyer, vider } = useConversation();
  const cheminDitALAgent = useRef("");
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ouvert) lireContexte(chemin).then(setContexte);
  }, [ouvert, chemin]);

  /**
   * Une question posée depuis un écran arrive écrite, pas envoyée.
   *
   * L'agent peut modifier les fichiers du workflow : une icône qui déclencherait
   * l'appel au clic ferait partir une écriture que personne n'a relue. On ouvre,
   * on remplit, on met le curseur au bout — l'envoi reste un geste.
   */
  useEffect(
    () =>
      ecouterLesAppels((question) => {
        setOuvert(true);
        setInstruction(question);
        requestAnimationFrame(() => {
          champ.current?.focus();
          champ.current?.setSelectionRange(question.length, question.length);
        });
      }),
    [],
  );

  /* L'agent écrit sur le disque que la page affiche : sans ce rafraîchissement,
     l'étape qu'il vient d'ajouter n'apparaît qu'au rechargement suivant, et on
     croit qu'il n'a rien fait. */
  useEffect(() => {
    if (!enCours && tours.at(-1)?.qui === "agent") router.refresh();
  }, [enCours, tours, router]);

  const partir = () => {
    const dit = instruction.trim();
    if (!dit || enCours) return;
    setInstruction("");
    envoyer(dit, chemin, cheminDitALAgent.current !== chemin);
    cheminDitALAgent.current = chemin;
  };

  /* Elle vit dans le champ vide, et Tab la prend — l'habitude du terminal, là
     où on ne veut pas quitter le clavier pour viser une puce. */
  const aPortee = instruction === "" ? suite : "";

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
          {enCours ? (
            <span className="shimmer font-mono text-meta">au travail…</span>
          ) : (
            tours.length > 0 && (
              <span className="rounded-full bg-paper/20 px-1.5 font-mono text-meta">
                {tours.length}
              </span>
            )
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
              onClick={vider}
              className="shrink-0 font-mono text-meta text-muted underline underline-offset-[3px] hover:text-ink"
            >
              nouveau chat
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

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
          {contexte && !contexte.peutEcrire && (
            <p className="shrink-0 rounded-controle border border-line-soft px-3 py-2 font-mono text-meta text-muted">
              lecture seule ici — un plugin ne se modifie pas depuis Orcha
            </p>
          )}

          <Fil tours={tours} enCours={enCours} />

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

          {/* Le bouton vit dans le champ : une messagerie n'a pas de bouton
              posé à côté, elle a une flèche au bord de la zone de saisie. */}
          <div className="relative shrink-0">
            <textarea
              ref={champ}
              rows={1}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                // Tab prend la proposition tant que le champ est vide. Dès
                // qu'on a tapé un mot, Tab redevient Tab : sortir du champ au
                // clavier doit rester possible.
                if (e.key === "Tab" && !e.shiftKey && aPortee) {
                  e.preventDefault();
                  setInstruction(aPortee);
                  return;
                }
                // Entrée envoie, Maj+Entrée passe à la ligne — l'habitude de
                // toute messagerie, et de celle-ci.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  partir();
                }
              }}
              placeholder={
                aPortee ||
                (tours.length ? "Réponds, ou demande autre chose…" : "Ce que tu veux savoir, ou changer.")
              }
              className="field block max-h-40 min-h-11 resize-none py-3 pr-14 text-note leading-[1.6]"
            />
            <button
              type="button"
              onClick={partir}
              disabled={enCours || instruction.trim() === ""}
              aria-label="Envoyer"
              className="btn-primary absolute right-1.5 bottom-1.5 min-h-0 size-[35px] px-0"
            >
              <Icone nom="envoyer" taille={16} trait={2} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ouvrir } from "@/components/agent/flux";
import { proposerLaSuite } from "@/app/(local)/actions-agent";
import { versee, type Tour } from "@/lib/agent/tour";

export type { Tour };

const MEMOIRE = "orcha.agent.fil";

/**
 * La discussion : son état, son flux, sa mémoire.
 *
 * Séparée du panneau parce que ce sont deux métiers — l'un tient une machine à
 * états sur un flux réseau, l'autre pose des boutons. Le panneau faisait les
 * deux et devenait illisible.
 *
 * Ce qui est gardé au navigateur est le reflet de la discussion, pas la
 * discussion elle-même : c'est le CLI qui la tient, par son identifiant de
 * session. On garde donc l'identifiant et l'affichage, jamais l'historique.
 */
export function useConversation() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [session, setSession] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [suite, setSuite] = useState("");
  const enVol = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const lu = JSON.parse(localStorage.getItem(MEMOIRE) ?? "null");
      if (!lu) return;
      setSession(lu.session ?? "");
      setTours(lu.tours ?? []);
    } catch {
      // Une mémoire abîmée n'empêche pas de discuter : on repart à vide.
    }
  }, []);

  useEffect(() => {
    if (enCours || (!session && tours.length === 0)) return;
    garder(session, tours);
  }, [session, tours, enCours]);

  // Un envoi part, l'onglet se ferme : sans ça, le CLI reste en vie derrière.
  useEffect(() => () => enVol.current?.abort(), []);

  const envoyer = useCallback(
    async (instruction: string, chemin: string, contexteNeuf: boolean) => {
      enVol.current?.abort();
      const arret = new AbortController();
      enVol.current = arret;

      setSuite("");
      setEnCours(true);
      setTours((f) => [...f, { qui: "moi", texte: instruction }, { qui: "agent", texte: "", gestes: [] }]);

      try {
        const flux = await ouvrir({ chemin, instruction, session, contexteNeuf }, arret.signal);
        if (arret.signal.aborted) return;
        setSession(flux.session);
        for await (const geste of flux.gestes) {
          // Un second envoi a abandonné celui-ci : le geste qui traînait dans le
          // tuyau irait sinon se verser dans le tour de la NOUVELLE question,
          // et sa réponse la fermerait avant qu'elle n'ait commencé.
          if (arret.signal.aborted) break;
          setTours((f) => versee(f, geste));
        }
      } catch (erreur) {
        if (arret.signal.aborted) return;
        setTours((f) => versee(f, { sorte: "echec", quoi: enPhrase(erreur) }));
      } finally {
        if (!arret.signal.aborted) setEnCours(false);
      }
    },
    [session],
  );

  const vider = useCallback(() => {
    enVol.current?.abort();
    setTours([]);
    setSession("");
    setSuite("");
    setEnCours(false);
    localStorage.removeItem(MEMOIRE);
  }, []);

  useSuite(tours, enCours, setSuite);
  return { tours, session, enCours, suite, envoyer, vider };
}

/**
 * La suite proposée dans le champ, une fois la réponse arrivée.
 *
 * Le `catch` n'est pas décoratif : la page se rafraîchit pendant que cette
 * requête vole, et une promesse non rattrapée s'affiche en erreur plein écran
 * — pour un indice que personne n'a demandé.
 */
function useSuite(tours: Tour[], enCours: boolean, poser: (s: string) => void) {
  useEffect(() => {
    const dernier = tours.at(-1);
    if (enCours || dernier?.qui !== "agent" || dernier.echec || dernier.texte === "") return;
    let vivant = true;
    proposerLaSuite(tours.at(-2)?.texte ?? "", dernier.texte)
      .then((rendue) => vivant && poser(rendue))
      .catch(() => vivant && poser(""));
    return () => {
      vivant = false;
    };
  }, [tours, enCours, poser]);
}

/**
 * Les diffs ne sont pas gardés d'une session à l'autre.
 *
 * Une seule écriture de gros fichier remplit le quota du navigateur, et le fil
 * entier serait alors perdu — pour une preuve qu'on ne relit plus après avoir
 * rechargé. Le geste reste, son contenu part.
 */
function garder(session: string, tours: Tour[]): void {
  const allege = tours.map((t) => ({
    ...t,
    gestes: t.gestes?.map(({ sorte, quoi }) => ({ sorte, quoi })),
  }));
  try {
    localStorage.setItem(MEMOIRE, JSON.stringify({ session, tours: allege }));
  } catch {
    // Quota plein : la discussion continue, elle ne survivra pas au rechargement.
  }
}

function enPhrase(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : "L'agent n'a pas pu être joint.";
}

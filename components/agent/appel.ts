/**
 * Appeler l'agent depuis n'importe quel écran.
 *
 * Le panneau vit dans la coquille (`app/(local)/layout.tsx`), les boutons qui
 * l'appellent vivent au fond des pages, et entre les deux il n'y a que des
 * composants serveur — donc ni props ni contexte React possibles sans envelopper
 * toute l'application dans un fournisseur client.
 *
 * Un événement de fenêtre traverse ça sans rien envelopper. C'est le même
 * mécanisme que le navigateur emploie pour lui-même, et il coûte huit lignes.
 */
const EVENEMENT = "orcha:agent";

/** Ouvre le panneau avec une question déjà écrite. Elle n'est PAS envoyée. */
export function appelerLAgent(question: string): void {
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: question }));
}

/** Rend de quoi se désabonner : un `useEffect` le rendra tel quel. */
export function ecouterLesAppels(surAppel: (question: string) => void): () => void {
  const ecouteur = (evenement: Event) => surAppel(String((evenement as CustomEvent).detail ?? ""));
  window.addEventListener(EVENEMENT, ecouteur);
  return () => window.removeEventListener(EVENEMENT, ecouteur);
}

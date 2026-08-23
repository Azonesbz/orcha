/**
 * L'en-tête d'un écran : le surtitre, le titre, et ce qui le situe.
 *
 * Le surtitre est le seul geste typographique appuyé de la charte — capitales
 * espacées en Citron. Il nomme la nature de l'écran, pas son contenu :
 * « inventaire », « tableau de bord ». Le titre, lui, dit le contenu.
 *
 * `chemin` remplace `intro` quand ce qui situe l'écran est un fichier : ça
 * existe sur le disque, donc ça s'écrit en mono.
 */
export function EnteteEcran({
  surtitre,
  titre,
  intro,
  chemin,
  serre,
}: {
  surtitre?: string;
  titre: string;
  intro?: string;
  chemin?: string;
  /** Un écran dont le contenu suit immédiatement respire moins sous le titre. */
  serre?: boolean;
}) {
  return (
    <header className={serre ? "mb-6" : "mb-8"}>
      {surtitre && <div className="surtitre mb-2.5">{surtitre}</div>}
      <h1 className="text-ecran font-semibold tracking-[-0.01em]">{titre}</h1>
      {intro && <p className="mt-2.5 max-w-[60ch] text-intro text-muted">{intro}</p>}
      {chemin && <p className="mt-2 font-mono text-meta-lg text-muted">{chemin}</p>}
    </header>
  );
}

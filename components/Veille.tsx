import type { Veille as EtatVeille } from "@/lib/lecture/veille";

/**
 * Le hook de veille, avec le bloc calculé pour CETTE machine.
 *
 * Le chemin était écrit à la main dans le README : juste chez son auteur, faux
 * chez tout le monde. On ne demande jamais de remplacer un SessionStart
 * existant — il appartient peut-être à un autre outil.
 */
export function Veille({ veille }: { veille: EtatVeille }) {
  return (
    <section id="veille" className="mb-10 scroll-mt-4">
      <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2.5">
        <h2 className="text-section font-semibold">Le hook</h2>
        <span
          className={`font-mono text-meta-lg ${veille.installe ? "text-accent-soft" : "text-danger"}`}
        >
          {veille.installe ? "en place" : "pas installée"}
        </span>
      </div>

      <p className="mb-3.5 max-w-[70ch] text-description text-muted">
        Un plugin mort ne charge pas ses propres hooks : il ne peut donc pas signaler sa mort. Ce
        petit script vit à l&apos;écart et te prévient au démarrage d&apos;une session, uniquement
        s&apos;il trouve un écart. Le reste du temps, il se tait.
      </p>

      {veille.installe ? (
        <p className="text-corps text-ink-soft">
          Déclarée dans <code className="font-mono text-meta-lg text-accent-soft">{veille.fichierReglages}</code>.
        </p>
      ) : (
        <div className="card p-5">
          <p className="mb-2.5 text-corps">
            {veille.autreHookPresent ? (
              <>
                Un <code>SessionStart</code> existe déjà dans{" "}
                <code className="font-mono text-meta-lg text-accent-soft">{veille.fichierReglages}</code> et appartient à
                autre chose.{" "}
                <strong className="font-semibold">Fusionne le tableau, ne le remplace pas.</strong>
              </>
            ) : (
              <>
                À coller dans <code className="font-mono text-meta-lg text-accent-soft">{veille.fichierReglages}</code>.
              </>
            )}
          </p>
          <pre className="overflow-x-auto rounded-controle border border-line bg-paper p-3.5 font-mono text-meta leading-[1.75] text-ink-soft">
            {veille.bloc}
          </pre>
        </div>
      )}
    </section>
  );
}

/**
 * La section qui remplace le témoignage.
 *
 * Zéro acheteur, donc zéro citation : la seule preuve disponible est le travail
 * d'audit lui-même. Il traite du même coup l'objection la plus chère de cette
 * niche — « le diagnostic intégré suffit » — et ne se réfute qu'en refaisant la
 * mesure, ce que personne n'a fait.
 *
 * La note d'honnêteté ferme la section volontairement : une table qui met huit
 * outils en défaut doit dire aussi ce qu'elle ne sait pas faire.
 */
/** La colonne de gauche : même gouttière et même alignement dans les deux cas. */
const CELLULE = "py-3 pr-3 align-top";

const MESURES = [
  { periode: "avant le 14 août", valeur: "1 / 976" },
  { periode: "à partir du 14 août", valeur: "51 / 81" },
];

const DIAGNOSTICS: Array<{ outil: string; fait: React.ReactNode }> = [
  { outil: "claude doctor", fait: "« No installation issues found »" },
  { outil: "/doctor en session", fait: (
      <>
        Son prompt exclut les erreurs de chargement de plugin. Aurait recommandé de le{" "}
        <strong className="font-semibold text-ink">désactiver</strong> : zéro invocation
      </>
    ) },
  { outil: "/plugin, onglet Errors", fait: "Ne lève rien. Range le plugin sous « Not used recently »" },
  { outil: "/context", fait: "Décrit la session qu'il vient d'ouvrir. Pas de --json, aucun contrat de format" },
  { outil: "claude plugin list --json", fait: (
      <>
        <strong className="font-semibold text-ink">Répare en silence</strong> avant d&apos;afficher,
        puis annonce enabled: true
      </>
    ) },
  { outil: "cc-harness", fait: "Son contrôle hook-script-missing est du code mort : aucun site d'appel" },
  {
    outil: "claudelint et les autres",
    fait: "Validation de schéma, proxy, transcriptions. Aucun ne fait la soustraction",
  },
];

export function Credibilite() {
  return (
    <section id="credibilite" className="mt-20 scroll-mt-4 sm:mt-28">
      <p className="surtitre">// LA MESURE QUE PERSONNE NE FAIT</p>
      <h2 className="mt-4 max-w-3xl text-xl font-semibold text-balance sm:text-2xl">
        Les diagnostics intégrés ne mentent pas. Ils regardent ailleurs.
      </h2>
      <p className="mt-3 max-w-2xl text-base text-ink-soft">
        Le cas est daté. Un plugin inscrit dans <code>enabledPlugins</code> depuis le 14 juillet,
        dont la charge utile avait disparu du disque. Relevé sur une seule machine — la mienne —
        sur 1&#8239;057 transcriptions :
      </p>

      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        {MESURES.map((mesure) => (
          <div key={mesure.periode} className="bg-surface p-5">
            <p className="surtitre">{mesure.periode}</p>
            <p className="mt-2 font-mono text-3xl font-medium">{mesure.valeur}</p>
            <p className="mt-1 text-xs text-muted">transcriptions où la méthodo est appelée</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Un mois sans méthodo, et rien ne l&apos;a dit.</p>

      <table className="mt-10 w-full border-collapse text-left text-sm">
        <caption className="sr-only">Ce que fait chaque outil devant le cas</caption>
        <thead>
          <tr className="border-b border-line-strong text-xs font-medium text-muted">
            <th scope="col" className="w-2/5 py-2 pr-3">Outil</th>
            <th scope="col" className="py-2">Devant un plugin déclaré dont le code a disparu</th>
          </tr>
        </thead>
        <tbody>
          {DIAGNOSTICS.map((ligne) => (
            <tr key={ligne.outil} className="border-b border-line">
              <th scope="row" className={`${CELLULE} font-mono text-xs font-normal text-ink-soft`}>{ligne.outil}</th>
              <td className="py-3 align-top text-muted">{ligne.fait}</td>
            </tr>
          ))}
          <tr className="bg-accent-wash">
            <th scope="row" className={`${CELLULE} text-base font-semibold`}>Orcha</th>
            <td className="py-3 align-top text-ink-soft">
              Confronte le déclaré au présent sur le disque, et nomme l&apos;écart
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-8 max-w-2xl border-l-2 border-line-strong pl-4 text-sm text-muted">
        Orcha ne calcule pas l&apos;état effectif complet — c&apos;est impossible depuis le disque
        seul, une couche de réglages administrés est délivrée à la connexion. Il dit « voici un
        écart certain », jamais « voici tout ce qui tourne ».
      </p>
    </section>
  );
}

import { Icone } from "@/components/icones";
import { Silences } from "@/components/primitives";
import { Installer } from "@/components/veille/Installer";
import type { Veille as EtatVeille } from "@/lib/lecture/veille";

/**
 * Le hook de veille, et son état réel sur cette machine.
 *
 * Le chemin était écrit à la main dans le README : juste chez son auteur, faux
 * chez tout le monde. Puis il a pointé dans le paquet npm — un cache que npm
 * efface et qui change de nom à chaque mise à jour. Il vit désormais dans
 * `~/.claude/hooks/orcha/`, à côté des réglages qu'il surveille, et Orcha l'y
 * installe lui-même.
 */
export function Veille({ veille }: { veille: EtatVeille }) {
  const enPlace = veille.installe && !veille.declareAilleurs && veille.copieEnPlace;

  return (
    <section id="veille" className="mb-10 max-w-[70ch] scroll-mt-4">
      <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2.5">
        <h2 className="text-section font-semibold">Le hook</h2>
        <span
          className={`font-mono text-meta-lg ${enPlace ? "text-accent-soft" : "text-danger"}`}
        >
          {etiquette(veille, enPlace)}
        </span>
        <span className="ml-auto font-mono text-meta text-muted">
          {veille.python.present ? veille.python.version : "python3 introuvable"}
        </span>
      </div>

      <p className="mb-3.5 text-description text-muted">
        Un plugin mort ne charge pas ses propres hooks : il ne peut donc pas signaler sa mort. Ce
        petit script vit à l&apos;écart et te prévient au démarrage d&apos;une session, uniquement
        s&apos;il trouve un écart. Le reste du temps, il se tait.
      </p>

      {/* « Pas installée » sans raison est le silence même contre lequel Orcha
          existe : quand la lecture butte, elle dit sur quoi. */}
      {veille.raison && (
        <Silences silences={[{ cause: "réglages illisibles", detail: veille.raison }]} />
      )}

      {/* Le hook est en Python alors que l'outil ne demande que Node. Sans ce
          contrôle, l'installation réussit et le hook échoue à chaque session. */}
      {!veille.python.present && (
        <Silences
          silences={[
            {
              cause: "python3 absent",
              detail:
                "Le hook est un script Python. Installe python3 — il est déjà là sur macOS avec " +
                "les outils Xcode, et dans les dépôts de toute distribution Linux.",
            },
          ]}
        />
      )}

      {enPlace ? <EnPlace veille={veille} /> : <APoser veille={veille} />}
    </section>
  );
}

function etiquette(veille: EtatVeille, enPlace: boolean): string {
  if (enPlace) return "en place";
  if (veille.declareAilleurs) return "déclaré hors de ~/.claude";
  if (veille.installe) return "déclaré, copie absente";
  return "pas installé";
}

function EnPlace({ veille }: { veille: EtatVeille }) {
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-2 text-corps text-ink-soft">
        <Icone nom="valider" taille={14} />
        Déclaré dans
        <code className="font-mono text-meta-lg text-accent-soft">{veille.fichierReglages}</code>
      </p>
      <p className="mt-1.5 font-mono text-meta text-muted">{veille.cheminInstalle}</p>
      <Installer libelle="Réinstaller" aide="remplace la copie par celle de cette version" />
    </>
  );
}

function APoser({ veille }: { veille: EtatVeille }) {
  return (
    <div className="card p-5">
      <p className="text-corps">{quoiFaire(veille)}</p>
      {veille.autreHookPresent && (
        <p className="mt-2 text-description text-muted">
          Un autre <code className="font-mono">SessionStart</code> est déjà déclaré : il sera
          conservé, l&apos;installation ajoute une entrée à côté.
        </p>
      )}

      {veille.sourceDisponible ? (
        <Installer
          libelle="Installer le hook"
          aide={`copie dans ${veille.cheminInstalle}, puis déclare`}
        />
      ) : (
        <Silences
          silences={[
            {
              cause: "paquet incomplet",
              detail:
                "Le hook n'est pas livré avec cette version d'Orcha. Mets-la à jour : " +
                "npm install -g orcha-cli@latest",
            },
          ]}
        />
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-description text-muted">
          Le faire à la main — le bloc à fusionner dans settings.json
        </summary>
        <pre className="mt-2.5 overflow-x-auto rounded-controle border border-line bg-paper p-3.5 font-mono text-meta leading-[1.75] text-ink-soft">
          {veille.bloc}
        </pre>
        <p className="mt-2 text-description text-muted">
          C&apos;est la valeur de <code className="font-mono">hooks</code> qu&apos;il remplace, pas
          une entrée : collé un cran trop bas, le hook ne se déclenche pas.
        </p>
      </details>
    </div>
  );
}

function quoiFaire(veille: EtatVeille): string {
  if (veille.declareAilleurs) {
    return "Un hook est déclaré, mais il pointe hors de ~/.claude — un chemin de paquet, qui change à chaque mise à jour. Réinstalle-le pour le fixer.";
  }
  if (veille.installe) return "Le hook est déclaré, mais sa copie n'est pas sur le disque.";
  return "Rien n'est déclaré. Orcha peut poser le hook et l'inscrire dans tes réglages.";
}

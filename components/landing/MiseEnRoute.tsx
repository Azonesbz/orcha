import type { ReactNode } from "react";
import { ARemplir } from "./ARemplir";

/**
 * Ce que l'outil touche sur le disque — dit avant l'installation, pas après.
 *
 * Un programme qui lit `~/.claude` et se propose d'y écrire réclame une
 * confiance que personne ne doit accorder sur parole. Les quatre garde-fous
 * sont donc posés pendant que le lecteur peut encore dire non, et en clair
 * plutôt que dans une page annexe : sur cette cible ils sont l'argument de
 * vente, pas la mention légale.
 */

function GardeFou({
  rang,
  titre,
  children,
}: {
  rang: number;
  titre: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="card flex gap-4 p-5">
      {/* Le rang est déjà porté par la liste ordonnée : ce jeton n'est que son écho visible. */}
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line-strong font-mono text-xs text-muted"
      >
        {rang}
      </span>
      <div>
        <p className="font-medium text-ink">{titre}</p>
        <p className="mt-1.5 text-ink-soft">{children}</p>
      </div>
    </li>
  );
}

export function MiseEnRoute() {
  return (
    <section className="mt-20">
      <p className="surtitre">// MISE EN ROUTE</p>
      <h2 className="mt-3 max-w-3xl text-2xl sm:text-3xl">
        Ce qu&apos;il touche sur ton disque, avant que tu l&apos;installes.
      </h2>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        <GardeFou
          rang={1}
          titre={
            <>
              Il écoute <code className="font-mono">127.0.0.1</code> uniquement.
            </>
          }
        >
          Ce n&apos;est pas du confort : aucune action n&apos;est authentifiée, donc sur{" "}
          <code className="font-mono">0.0.0.0</code> n&apos;importe qui sur ton réseau pourrait
          réécrire un <code className="font-mono">SKILL.md</code> — c&apos;est-à-dire déposer des
          instructions que Claude Code exécuterait à la session suivante.
        </GardeFou>

        <GardeFou rang={2} titre="La lecture ne touche à rien.">
          Aucun secret n&apos;est ouvert : ni jeton, ni clé d&apos;API, ni contenu de{" "}
          <code className="font-mono">.secrets/</code>.
        </GardeFou>

        <GardeFou rang={3} titre="L'écriture passe trois garde-fous.">
          Avant d&apos;écrire une ligne : hors des racines <code className="font-mono">.claude</code>{" "}
          connues, hors d&apos;un <code className="font-mono">SKILL.md</code>, dans un plugin. Puis
          fichier temporaire et renommage — une session qui lit au même instant ne voit jamais un
          fichier à moitié écrit.
        </GardeFou>

        <GardeFou rang={4} titre="Il refuse d'écrire dans un plugin, et affiche pourquoi.">
          Un plugin est un clone de dépôt : la modification serait écrasée au prochain{" "}
          <code className="font-mono">claude plugin update</code>, en silence.
        </GardeFou>
      </ol>

      <div className="mt-3">
        <div className="card border-accent/40 p-5">
          <p className="surtitre">Installer</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-paper p-4 font-mono text-sm text-ink select-all">
            npx orcha-cli
          </pre>
          <p className="mt-3 max-w-prose text-sm text-muted">
            Rien à cloner, rien à configurer. La commande télécharge l&apos;outil, le démarre sur{" "}
            <code className="font-mono">127.0.0.1</code> et ouvre ton navigateur.{" "}
            <strong className="text-ink-soft">Node 20 ou plus</strong> suffit — l&apos;outil
            entier tourne dessus. Seule la veille au démarrage, facultative, demande en plus un{" "}
            <code className="font-mono">python3</code> : son hook est un script Python, et
            l&apos;écran Veille dit s&apos;il est présent sur ta machine.
          </p>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Le code est ouvert, sous licence MIT —{" "}
            <a
              href="https://github.com/Azonesbz/orcha"
              className="text-ink underline underline-offset-4"
              rel="noreferrer noopener"
            >
              lis-le avant de le lancer
            </a>
            , c&apos;est un outil qui écrit dans ton <code className="font-mono">~/.claude</code>.
          </p>
        </div>
      </div>
    </section>
  );
}

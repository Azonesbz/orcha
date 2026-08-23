import { Icone } from "@/components/icones";
import { COULEUR_PORTEE } from "@/components/portee";
import type { Portee, Silence } from "@/lib/types";

/**
 * Ce que chaque portée veut dire, en une phrase.
 *
 * Le mot « portée » ne définit rien pour qui découvre l'outil, et la couleur
 * seule ne portait pas l'information — la charte code deux teintes et un
 * neutre, ce qui ne suffit pas à distinguer un plugin d'un intégré.
 */
const SENS_PORTEE: Record<Portee, string> = {
  utilisateur: "Vient de ton dossier personnel. Actif dans toutes tes sessions, et modifiable ici.",
  projet: "Vient du .claude de ce projet. Actif seulement ici, et modifiable ici.",
  plugin:
    "Fourni par un plugin installé. Actif partout, mais non modifiable ici : un plugin est un clone qui sera réécrit à sa mise à jour.",
  intégré: "Fourni par Claude Code lui-même. Aucun fichier sur le disque.",
};

/** Bordure et encre, jamais d'aplat. Une origine longue se tronque, c'est voulu. */
export function Pastille({ portee, origine }: { portee: Portee; origine: string }) {
  return (
    <PastillePortee portee={portee}>
      {portee} · {origine}
    </PastillePortee>
  );
}

/** La coquille seule — pour les endroits où la portée se dit sans son origine. */
export function PastillePortee({
  portee,
  children,
}: {
  portee: Portee;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block max-w-[16rem] shrink-0 truncate rounded-badge border px-2 py-0.5 font-mono text-meta ${COULEUR_PORTEE[portee]}`}
      title={SENS_PORTEE[portee]}
    >
      {children}
    </span>
  );
}

export function Panneau({
  titre,
  compte,
  ecarts,
  intro,
  vide,
  children,
}: {
  titre: string;
  compte: number;
  ecarts?: number;
  intro?: string;
  /** Ce qu'on a regardé, pour que « rien » ne veuille pas dire « cassé ». */
  vide?: string;
  children: React.ReactNode;
}) {
  const ancre = titre.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
  return (
    <section id={ancre} className="mb-10 scroll-mt-4">
      <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-2.5">
        <h2 className="text-section font-semibold">{titre}</h2>
        <span className="font-mono text-meta-lg text-muted">{compte}</span>
        {ecarts ? (
          <span className="font-mono text-meta-lg text-danger">dont {ecarts} sans effet</span>
        ) : null}
      </div>
      {intro && <p className="mb-3.5 max-w-[70ch] text-description text-muted">{intro}</p>}
      {compte === 0 ? <p className="text-corps text-muted">{vide ?? "Rien ici."}</p> : children}
    </section>
  );
}

/**
 * Le rouge arrive toujours en deux temps : la cause en trois mots, le détail
 * en une phrase. Un encart sans détail est une faute de charte.
 */
export function Silences({ silences }: { silences: Silence[] }) {
  if (silences.length === 0) return null;
  return (
    <ul className="mt-2 flex w-full flex-col gap-1.5">
      {silences.map((s, i) => (
        <li
          key={i}
          className="flex items-baseline gap-2 rounded-lg border border-danger/30 bg-danger-wash px-2.5 py-[7px] text-meta-lg text-danger"
        >
          <span className="translate-y-[1.5px]">
            <Icone nom="alerte" taille={12} />
          </span>
          <span>
            <strong className="font-semibold">{s.cause}</strong> — {s.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Une entrée : la ligne de titre, puis la description sur sa propre rangée. */
export function Entree({
  titre,
  description,
  silences,
}: {
  titre: React.ReactNode;
  description?: string;
  silences?: Silence[];
}) {
  return (
    <li className="border-b border-line-faible py-3 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">{titre}</div>
      {description && (
        <p className="mt-1 line-clamp-2 max-w-[70ch] text-note text-muted" title={description}>
          {description}
        </p>
      )}
      {silences && <Silences silences={silences} />}
    </li>
  );
}

export function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="card px-5 py-0">{children}</ul>;
}

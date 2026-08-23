import type { Route } from "next";
import Link from "next/link";
import { Icone, type NomIcone } from "@/components/icones";
import { COULEUR_PART } from "@/components/portee";

/**
 * Les pièces du tableau de bord.
 *
 * Aucun graphique pour les compteurs : douze compétences et quarante règles de
 * permission ne se comparent pas, ce sont des objets différents. Une tuile dit
 * un nombre et ce qu'il vaut ; c'est tout ce qu'on peut en dire honnêtement.
 */
export function Tuile({
  titre,
  valeur,
  precision,
  icone,
  href,
  alerte,
}: {
  titre: string;
  valeur: string | number;
  precision?: string;
  icone: NomIcone;
  href?: Route;
  alerte?: boolean;
}) {
  const nombre = typeof valeur === "number";
  const contenu = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
          {titre}
        </span>
        <span className="text-accent opacity-85">
          <Icone nom={icone} taille={16} />
        </span>
      </div>
      {/* Un compte s'écrit en mono : il existe sur le disque, il s'atteste.
          Un état — « en place », « absente » — est une phrase, pas un chiffre. */}
      <span
        className={`block leading-none ${
          nombre ? "mt-3 font-mono text-[34px] font-medium" : "mt-[18px] text-[22px] font-semibold"
        } ${alerte ? "text-danger" : "text-ink"}`}
      >
        {valeur}
      </span>
      {precision && <span className="mt-2.5 block text-description text-muted">{precision}</span>}
    </>
  );

  const classe = `card px-5 py-[18px] ${href ? "transition-colors hover:border-accent/40" : ""}`;
  return href ? (
    <Link href={href} className={classe}>
      {contenu}
    </Link>
  ) : (
    <div className={classe}>{contenu}</div>
  );
}

/** Une part de la répartition : d'où vient ce qui charge, et combien. */
export interface Part {
  nom: string;
  compte: number;
  detail: string;
}

/**
 * D'où vient ce qui charge, en une barre.
 *
 * La couleur est celle de la portée, pas celle d'un rang : projet en Citron,
 * personnel en Ciel, plugins en neutre — les mêmes teintes que les pastilles.
 * Encoder par l'index aurait donné le Ciel aux plugins dès que « Toi » est
 * masqué par la case à cocher, et la même barre aurait voulu dire deux choses.
 */
export function RepartitionPortee({ parts }: { parts: Part[] }) {
  const total = parts.reduce((somme, p) => somme + p.compte, 0);
  if (total === 0) return null;

  return (
    <section className="card self-start px-5 py-[18px]">
      <h2 className="text-section font-semibold">D&apos;où vient ce qui charge</h2>

      <div className="mt-3.5 flex gap-[3px]" role="img" aria-label={legende(parts)}>
        {parts
          .filter((p) => p.compte > 0)
          .map((p) => (
            <span
              key={p.nom}
              className="h-2.5 rounded-full"
              style={{ width: `${(p.compte / total) * 100}%`, background: COULEUR_PART[p.nom] }}
            />
          ))}
      </div>

      <dl className="mt-3.5 space-y-2">
        {parts.map((p) => (
          <div key={p.nom} className="flex items-baseline gap-2.5 text-description">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: COULEUR_PART[p.nom] }}
            />
            <dt className="font-medium text-ink-soft">{p.nom}</dt>
            <dd className="font-mono tabular-nums text-muted">{p.compte}</dd>
            <dd className="min-w-0 flex-1 truncate text-muted">{p.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function legende(parts: Part[]): string {
  return parts.map((p) => `${p.nom} : ${p.compte}`).join(", ");
}

/** Ce qui demande une décision. Vide, c'est la bonne nouvelle. */
export function Ecarts({
  lignes,
}: {
  lignes: Array<{ quoi: string; cause: string; ou: string; href?: Route }>;
}) {
  return (
    <section className="card px-5 py-[18px]">
      <h2 className="text-section font-semibold">Ce qui demande un coup d&apos;œil</h2>
      {lignes.length === 0 ? (
        <p className="mt-3.5 text-corps text-ink-soft">
          Rien. Tout ce qui est déclaré charge réellement.
        </p>
      ) : (
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {lignes.map((l, i) => (
            <li key={i} className="border-b border-line pb-2.5 text-sm last:border-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                {l.href ? (
                  <Link
                    href={l.href}
                    className="font-semibold underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
                  >
                    {l.quoi}
                  </Link>
                ) : (
                  <span className="font-semibold">{l.quoi}</span>
                )}
                {/* La cause accompagne toujours le rouge : jamais de verdict
                    sans sa raison, c'est la doctrine de la charte. */}
                <span className="font-mono text-[11.5px] text-danger">{l.cause}</span>
              </div>
              <p className="mt-[3px] font-mono text-meta text-muted">{l.ou}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

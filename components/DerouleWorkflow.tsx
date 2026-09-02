import type { Deroule, SessionMesuree } from "@/lib/lecture/mesures";
import { EtapesMesurees } from "@/components/EtapesMesurees";
import { duree } from "@/lib/temps";

/**
 * Le second volet de la page workflow : le plan déclaré, puis son déroulé.
 *
 * Le plan est au-dessus, ses chiffres ici, chaque ligne portant le numéro
 * d'étape du plan — une page « Sessions » séparée dirait la même chose en
 * obligeant à faire la jointure de tête, ce que la mesure existe pour éviter.
 *
 * On n'affiche que des métriques et des libellés. **Jamais un corps de
 * message** : les transcriptions contiennent les prompts entiers, donc
 * potentiellement des secrets et des données client.
 */
export function DerouleWorkflow({
  deroule,
  lues,
  total,
}: {
  deroule: Deroule | null;
  /** Combien de transcriptions ont été ouvertes. */
  lues: number;
  /** Combien il en existe — pour dire ce qu'on n'a pas ouvert. */
  total: number;
}) {
  if (!deroule) {
    return (
      <Volet resume="aucun projet choisi">
        <p className="text-description text-muted">
          Le déroulé se lit dans les transcriptions du projet regardé. Choisis un projet pour
          l&apos;afficher.
        </p>
      </Volet>
    );
  }

  return (
    <Volet
      resume={`${lues} séance${lues > 1 ? "s" : ""} lue${lues > 1 ? "s" : ""} sur ${total} · ${deroule.sessions.length} sur ce workflow`}
      ecarts={
        deroule.nonReconnues > 0
          ? `${deroule.nonReconnues} transcription(s) au format non reconnu`
          : undefined
      }
    >
      {deroule.sessions.length === 0 ? (
        <p className="text-description text-muted">
          Aucune des séances lues n&apos;a franchi une étape de ce workflow. Il est déclaré, il
          n&apos;a pas été emprunté.
        </p>
      ) : (
        <>
          <EtapesMesurees etapes={deroule.etapes} sur={deroule.sessions.length} />

          <h3 className="mt-7 mb-2.5 text-module font-semibold">Les séances</h3>
          <ul className="card px-5">
            {deroule.sessions.map((session) => (
              <Seance key={session.id} session={session} />
            ))}
          </ul>

          <p className="mt-4 font-mono text-meta leading-relaxed text-muted">
            une étape est dite franchie quand son fichier a été lu · l&apos;orchestrateur qui
            l&apos;a déjà en contexte ne la relit pas, d&apos;où « non observée » et jamais
            « non faite »
            <br />
            une étape court jusqu&apos;à la lecture de la suivante · la dernière porte donc tout ce
            qui reste de la séance · les trous de plus de trente minutes sont retranchés
          </p>
        </>
      )}
    </Volet>
  );
}

function Volet({
  resume,
  ecarts,
  children,
}: {
  resume: string;
  ecarts?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3.5 flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2.5">
        <h2 className="text-section font-semibold">Déroulé mesuré</h2>
        <span className="font-mono text-meta-lg text-muted">{resume}</span>
        {ecarts && <span className="ml-auto font-mono text-meta text-danger">{ecarts}</span>}
      </div>
      {children}
    </section>
  );
}

function Seance({ session }: { session: SessionMesuree }) {
  return (
    <li className="border-b border-line-faible py-3 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-corps">{session.titre ?? "séance sans titre"}</span>
        <span className="font-mono text-meta text-muted">
          {duree(session.duree)} dont {duree(session.attente)} d&apos;attente
        </span>
        <span className="ml-auto font-mono text-meta text-muted">
          {session.aboutie ? (
            `dernière étape ${session.derniereEtape}`
          ) : (
            <span className="text-danger">arrêtée à l&apos;étape {session.derniereEtape}</span>
          )}
        </span>
      </div>
      {session.chaine.length > 0 && (
        <p className="mt-1.5 font-mono text-meta">
          {session.chaine.map((agent, i) => (
            <span key={i} className={session.reprises.includes(agent) ? "text-accent-soft" : "text-muted"}>
              {i > 0 && <span className="text-faint"> › </span>}
              {agent}
            </span>
          ))}
          {session.reprises.length > 0 && <span className="text-muted"> · travail repris</span>}
        </p>
      )}
    </li>
  );
}

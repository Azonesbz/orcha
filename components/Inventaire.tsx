"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FiltreInventaire } from "@/components/FiltreInventaire";
import { Icone } from "@/components/icones";
import { Entree, Liste, Panneau, Pastille } from "@/components/primitives";
import type { Atelier } from "@/lib/types";

/**
 * L'inventaire filtrable.
 *
 * Le filtre est un `useState` et un `includes` : sur cent-cinquante lignes
 * rendues côté serveur, ça suffit, et ça évite d'introduire une navigation où
 * se perdre.
 */
export type Section =
  | "plugins"
  | "competences"
  | "agents"
  | "commandes"
  | "hooks"
  | "permissions"
  | "instructions";

export function Inventaire({
  atelier,
  aDesEtapes,
  sections,
}: {
  atelier: Atelier;
  aDesEtapes: string[];
  /** Les panneaux à rendre. Chaque route n'en montre que les siens. */
  sections: Section[];
}) {
  const montre = (s: Section) => sections.includes(s);
  const [filtre, setFiltre] = useState("");
  const [projetSeul, setProjetSeul] = useState(false);
  const avecPlan = useMemo(() => new Set(aDesEtapes), [aDesEtapes]);
  const garde = (...champs: Array<string | undefined>) =>
    filtre.trim() === "" ||
    champs.some((c) => (c ?? "").toLowerCase().includes(filtre.trim().toLowerCase()));

  /** « Ce projet seulement » écarte tout ce qui ne vient pas de son .claude. */
  const duProjet = (portee: string) => !projetSeul || portee === "projet";

  const competences = atelier.competences.filter((c) => duProjet(c.portee) && garde(c.nom, c.description, c.origine));
  const agents = atelier.agents.filter((a) => duProjet(a.portee) && garde(a.nom, a.description, a.origine));
  const commandes = atelier.commandes.filter((c) => duProjet(c.portee) && garde(c.nom, c.description, c.origine));
  const hooks = atelier.hooks.filter((h) => duProjet(h.portee) && garde(h.evenement, h.commande, h.matcher));
  const permissions = atelier.permissions.filter((r) => duProjet(r.portee) && garde(r.motif, r.decision, r.origine));
  const plugins = projetSeul ? [] : atelier.plugins;
  const instructions = atelier.instructions.filter((f) => duProjet(f.portee));

  return (
    <>
      <FiltreInventaire
        filtre={filtre}
        surFiltre={setFiltre}
        projetSeul={projetSeul}
        surProjetSeul={setProjetSeul}
      />

      {montre("plugins") && (
      <Panneau
        titre="Plugins"
        compte={plugins.length}
        ecarts={plugins.filter((p) => p.silences.length).length}
        intro="Un plugin apporte des compétences, des agents et des commandes d'un coup. C'est lui qui explique la provenance de tout le reste."
        vide={projetSeul ? "Les plugins viennent de ~/.claude — masqués par « ce projet seulement »." : "Aucun plugin activé dans tes réglages."}
      >
        <Liste>
          {plugins.map((p) => (
            <Entree
              key={p.identifiant + p.cheminInstallation}
              silences={p.silences}
              titre={
                <>
                  <span className="font-medium">{p.identifiant}</span>
                  <span
                    className={`font-mono text-meta ${p.present ? "text-ink-soft" : "text-danger"}`}
                  >
                    {p.present ? "chargé" : "absent du disque"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-meta text-muted">
                    {p.cheminInstallation}
                  </span>
                </>
              }
            />
          ))}
        </Liste>
      </Panneau>
      )}

      {montre("plugins") && !projetSeul && atelier.catalogue.length > 0 && (
        <details className="card mb-10 px-5 py-4">
          <summary className="cursor-pointer text-corps font-semibold">
            Au catalogue, non activés — {atelier.catalogue.length}
          </summary>
          <p className="mt-2 max-w-[70ch] text-description text-muted">
            Ces plugins sont téléchargés sur ton disque mais absents de{" "}
            <code>enabledPlugins</code> : rien de leur contenu ne charge. Ils ne comptent donc dans
            aucune liste ci-dessus.
          </p>
          <ul className="mt-2">
            {atelier.catalogue.map((p) => (
              <li key={p.identifiant} className="border-b border-line-faible py-1.5 text-description last:border-0">
                <span className="font-mono">{p.identifiant}</span>{" "}
                <span className="text-muted">
                  {p.competences} compétences · {p.agents} agents · {p.commandes} commandes
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {montre("competences") && (
      <Panneau
        titre="Compétences"
        compte={competences.length}
        ecarts={competences.filter((c) => c.silences.length).length}
        vide={
          projetSeul
            ? `Aucune compétence dans ${atelier.racineProjet ?? "ce projet"}/skills.`
            : `Aucune compétence dans ${atelier.racineUtilisateur}/skills${atelier.racineProjet ? ` ni ${atelier.racineProjet}/skills` : ""}.`
        }
      >
        <Liste>
          {competences.map((c) => (
            <Entree
              key={c.chemin}
              description={c.description}
              silences={c.silences}
              titre={
                <>
                  <Link
                    href={`/competence/${encodeURIComponent(c.chemin)}`}
                    className="font-mono text-section font-semibold underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
                  >
                    {c.nom}
                  </Link>
                  <Pastille portee={c.portee} origine={c.origine} />
                  {avecPlan.has(c.chemin) && (
                    <Link
                      href={`/workflow/${encodeURIComponent(c.chemin)}`}
                      className="inline-flex items-center gap-[5px] rounded-badge bg-accent/10 px-2 py-0.5 font-mono text-meta text-accent-soft underline-offset-2 hover:underline"
                    >
                      <Icone nom="workflows" taille={11} />
                      voir le plan
                    </Link>
                  )}
                  {!c.invocableParLeModele && (
                    <span
                      className="inline-flex items-center gap-[5px] font-mono text-meta text-muted"
                      title="disable-model-invocation: true — Claude ne la chargera jamais de lui-même. Elle ne part que si tu la tapes. C'est un choix, pas une panne."
                    >
                      <Icone nom="a-la-main" taille={11} />
                      lancée à la main seulement
                    </span>
                  )}
                  <span className="ml-auto font-mono text-meta text-muted">{c.lignes} lignes</span>
                </>
              }
            />
          ))}
        </Liste>
      </Panneau>
      )}

      {montre("agents") && (
      <Panneau
        titre="Agents"
        compte={agents.length}
        ecarts={agents.filter((a) => a.silences.length).length}
        intro="Claude choisit un agent d'après sa description : c'est elle, et elle seule, qui décide s'il servira un jour."
        vide="Aucun agent."
      >
        <Liste>
          {agents.map((a) => (
            <Entree
              key={a.chemin}
              description={a.description}
              silences={a.silences}
              titre={
                <>
                  <Link
                    href={`/agent/${encodeURIComponent(a.chemin)}`}
                    className="font-mono text-section font-semibold underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
                  >
                    {a.nom}
                  </Link>
                  <Pastille portee={a.portee} origine={a.origine} />
                </>
              }
            />
          ))}
        </Liste>
      </Panneau>
      )}

      {montre("commandes") && (
      <Panneau
        titre="Commandes"
        compte={commandes.length}
        ecarts={commandes.filter((c) => c.silences.length).length}
        vide="Aucune commande."
      >
        <Liste>
          {commandes.map((c) => (
            <Entree
              key={c.chemin}
              description={c.description}
              silences={c.silences}
              titre={
                <>
                  <span className="font-mono font-medium">/{c.nom}</span>
                  <Pastille portee={c.portee} origine={c.origine} />
                </>
              }
            />
          ))}
        </Liste>
      </Panneau>
      )}

      {montre("hooks") && (
      <Panneau
        titre="Hooks"
        compte={hooks.length}
        ecarts={hooks.filter((h) => h.silences.length).length}
        intro="Une commande lancée automatiquement à un moment donné de la session."
        vide="Aucun hook déclaré dans tes réglages."
      >
        <Liste>
          {hooks.map((h, i) => (
            <Entree
              key={i}
              silences={h.silences}
              titre={
                <>
                  <span className="font-medium">{h.evenement}</span>
                  <Pastille portee={h.portee} origine={h.origine} />
                  {h.matcher && (
                    <span className="font-mono text-meta text-muted">{h.matcher}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-meta">{h.commande}</span>
                </>
              }
            />
          ))}
        </Liste>
      </Panneau>
      )}

      {montre("permissions") && (
      <Panneau
        titre="Permissions"
        compte={permissions.length}
        intro="Les permissions ne s'écrasent pas d'un fichier à l'autre : elles s'additionnent, et un « deny » l'emporte toujours sur un « allow ». « ask » veut dire : demander à chaque fois."
        vide="Aucune règle de permission."
      >
        <Liste>
          {permissions.map((r, i) => (
            <Entree
              key={i}
              titre={
                <>
                  <span
                    className={`font-mono text-meta ${r.decision === "deny" ? "text-danger" : "text-muted"}`}
                  >
                    {r.decision}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{r.motif}</span>
                  <Pastille portee={r.portee} origine={r.origine} />
                </>
              }
            />
          ))}
        </Liste>
      </Panneau>
      )}

      {montre("instructions") && (
      <Panneau
        titre="Instructions"
        compte={instructions.length}
        intro="Les fichiers CLAUDE.md chargés à chaque session."
        vide={projetSeul ? "Aucun CLAUDE.md dans ce projet." : "Aucun CLAUDE.md trouvé."}
      >
        <Liste>
          {instructions.map((f) => (
            <Entree
              key={f.chemin}
              titre={
                <>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{f.chemin}</span>
                  <span className="font-mono text-meta text-muted">
                    {f.lignes} lignes · {f.octets} octets
                  </span>
                </>
              }
            />
          ))}
        </Liste>
      </Panneau>
      )}
    </>
  );
}

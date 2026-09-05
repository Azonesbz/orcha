"use client";

import { useMemo, useRef, useState } from "react";
import { BLOC, mettreEnPlan, SATELLITE, type Lien } from "@/lib/plan";
import type { Workflow } from "@/lib/lecture/workflow";

/**
 * Le plan en SVG, avec mise en avant au survol.
 *
 * Survoler une étape éclaire ce qu'elle appelle ; survoler un sous-agent
 * éclaire les étapes qui l'appellent — le « utilisé par », qu'aucune lecture
 * du fichier ne donne d'un coup d'œil. Tout le reste s'estompe plutôt que de
 * disparaître : on garde le contexte.
 *
 * Le focus déclenche la même chose que le survol. Un plan qui ne se lit qu'à
 * la souris ne se lit pas au clavier, et les blocs sont déjà des cibles.
 */
/* 0,22 suffisait sur l'ancienne palette ; sur la charte noire — surface #111
   sur fond #0a0a0a — le texte estompé devenait illisible plutôt que
   recessif, et le plan semblait coupé net sous l'élément survolé. */
const ESTOMPE = 0.42;
/** Assez court pour suivre la souris, assez long pour que le fond ne clignote pas. */
const FONDU = "opacity 120ms ease, stroke-width 120ms ease";
/** De quoi éviter que les filets des blocs ne collent au bord de la carte. */
const MARGE = 16;
/* Le « utilisé par N étapes » du survol part au-delà du dernier satellite, et
   un `svg` racine coupe à son viewBox : sans cette réserve il ne restait qu'une
   lettre à l'écran. */
const GOUTTIERE_SURVOL = 170;

export function PlanWorkflow({
  workflow,
  destinations,
  surReordre,
  sautees,
  fin,
}: {
  workflow: Workflow;
  /** Où mène chaque bloc et chaque satellite, par identité. Vide = non cliquable. */
  destinations?: Record<string, string>;
  /** Appelé au dépôt d'une étape déplacée, avec les numéros dans l'ordre voulu. */
  surReordre?: (ordre: string[]) => void;
  /** Les numéros d'étapes que le drapeau choisi saute : grisées, liens compris. */
  sautees?: Set<string>;
  /** Le numéro de l'étape où le drapeau choisi arrête le workflow. */
  fin?: string | null;
}) {
  const plan = useMemo(() => mettreEnPlan(workflow), [workflow]);
  const idsSautes = useMemo(
    () => new Set(plan.blocs.filter((b) => sautees?.has(b.etape.numero)).map((b) => b.id)),
    [plan, sautees],
  );
  const [vise, setVise] = useState<string | null>(null);
  const [glisse, setGlisse] = useState<{ id: string; de: number; vers: number } | null>(null);
  /* Un bloc est aussi un lien : sans ce drapeau, tout déplacement finirait par
     ouvrir le fichier au relâchement. */
  const aGlisse = useRef(false);
  /* La même valeur que `glisse`, tenue en ref. Le relâchement a besoin de lire
     la position d'arrivée, et la lire depuis l'updater de `setGlisse` revenait
     à déclencher une écriture pendant un rendu — React refuse, à raison : un
     updater doit être pur. */
  const arrivee = useRef<{ de: number; vers: number } | null>(null);

  const pas = BLOC.hauteur + 30;

  /**
   * Le déplacement d'une étape, à la souris comme au doigt.
   *
   * Le seuil de cinq pixels sépare le clic du glisser : en dessous, on ouvre le
   * fichier ; au-dessus, on déplace. Sans lui, un clic un peu tremblant
   * réordonnerait le workflow.
   */
  function prendre(evenement: React.PointerEvent, id: string, index: number) {
    if (!surReordre || evenement.button !== 0) return;
    const departY = evenement.clientY;
    const cible = evenement.currentTarget as SVGGElement;
    cible.setPointerCapture(evenement.pointerId);
    aGlisse.current = false;

    const bouger = (evt: Event) => {
      const e = evt as PointerEvent;
      const ecart = e.clientY - departY;
      if (!aGlisse.current && Math.abs(ecart) < 5) return;
      aGlisse.current = true;
      const vers = Math.max(0, Math.min(plan.blocs.length - 1, index + Math.round(ecart / pas)));
      arrivee.current = { de: index, vers };
      setGlisse({ id, de: index, vers });
    };

    const lacher = () => {
      cible.removeEventListener("pointermove", bouger);
      cible.removeEventListener("pointerup", lacher);
      const fin = arrivee.current;
      arrivee.current = null;
      setGlisse(null);

      if (!fin || fin.vers === fin.de) return;
      const numeros = plan.blocs.map((b) => b.etape.numero);
      const [pris] = numeros.splice(fin.de, 1);
      numeros.splice(fin.vers, 0, pris);
      surReordre(numeros);
    };

    cible.addEventListener("pointermove", bouger);
    cible.addEventListener("pointerup", lacher);
  }

  /** Les identités à garder vives : la cible et son voisinage direct. */
  const enAvant = useMemo(() => {
    if (!vise) return null;
    const bloc = plan.blocs.find((b) => b.id === vise);
    if (bloc) return new Set([bloc.id, ...bloc.appelle]);
    const satellite = plan.satellites.find((s) => s.id === vise);
    if (satellite) return new Set([satellite.id, ...satellite.appelePar]);
    return null;
  }, [vise, plan]);

  const vif = (id: string) => !idsSautes.has(id) && (!enAvant || enAvant.has(id));
  const vifLien = (lien: Lien) =>
    !idsSautes.has(lien.extremites[0]) &&
    !idsSautes.has(lien.extremites[1]) &&
    (!enAvant || (enAvant.has(lien.extremites[0]) && enAvant.has(lien.extremites[1])));

  const largeur = plan.largeur + MARGE * 2 + GOUTTIERE_SURVOL;

  /* Taille naturelle, une unité du plan pour un pixel. Un `svg` sans `width`
     vaut 100 % de son parent : sur une carte de 1200 px le viewBox de 742 était
     agrandi d'une fois et demie, texte compris, et le plan sortait deux fois
     plus gros que le reste de la page. Le débordement du parent tient les
     écrans étroits — on fait défiler, on ne rapetisse pas. */
  return (
    <div className="card overflow-x-auto p-6">
      <svg
        viewBox={`${-MARGE} 0 ${largeur} ${plan.hauteur}`}
        width={largeur}
        height={plan.hauteur}
        role="img"
        aria-label={`Plan du workflow : ${plan.blocs.length} étapes`}
        onMouseLeave={() => setVise(null)}
      >
        <defs>
          <marker id="pointe" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="fill-muted" />
          </marker>
        </defs>

        {/* Le fond rend la main. Sans lui, quitter un bloc pour la toile
            laissait la surbrillance collée : c'est ce qui donnait l'impression
            d'un bug. Il est premier, donc derrière tout le reste. */}
        <rect
          x={-MARGE}
          y={0}
          width={largeur}
          height={plan.hauteur}
          fill="transparent"
          onMouseEnter={() => setVise(null)}
        />

        {plan.liens.map((lien, i) => (
          <Trait key={i} lien={lien} vif={vifLien(lien)} />
        ))}

        {plan.blocs.map(({ id, etape, x, y, depart, appelle }, index) => (
          <Ouvrable
            key={id}
            vers={destinations?.[id]}
            surClic={(e) => {
              if (aGlisse.current) {
                e.preventDefault();
                aGlisse.current = false;
              }
            }}
          >
          <g
            onPointerDown={(e) => prendre(e, id, index)}
            transform={decalage(index, glisse, pas)}
            tabIndex={destinations?.[id] ? undefined : 0}
            role="listitem"
            aria-label={`Étape ${etape.numero} — ${etape.role}${appelle.length ? `, appelle ${appelle.length} élément(s)` : ""}`}
            style={{ opacity: vif(id) ? 1 : ESTOMPE, transition: FONDU }}
            className={surReordre ? "cursor-grab" : destinations?.[id] ? "cursor-pointer" : "cursor-default"}
            onMouseEnter={() => setVise(id)}
            onFocus={() => setVise(id)}
            onBlur={() => setVise(null)}
          >
            {depart && (
              <text x={x + 10} y={y - 10} className="fill-accent font-mono text-[11px]">
                ▸ point de départ
              </text>
            )}
            {sautees?.has(etape.numero) && (
              <text x={x + BLOC.largeur - 10} y={y - 10} textAnchor="end" className="fill-muted font-mono text-[11px]">
                sautée par le drapeau
              </text>
            )}
            {fin === etape.numero && (
              <text x={x + 10} y={y + BLOC.hauteur + 18} className="fill-danger font-mono text-[11px]">
                ■ fin du workflow sous ce drapeau
              </text>
            )}
            <rect
              x={x}
              y={y}
              width={BLOC.largeur}
              height={BLOC.hauteur}
              rx={10}
              fill="var(--color-paper)"
              stroke={
                !etape.present
                  ? "var(--color-danger)"
                  : depart
                    ? "var(--color-accent)"
                    : "rgba(240,232,214,0.14)"
              }
              style={{ strokeWidth: vise === id ? 2 : depart ? 1.5 : 1, transition: FONDU }}
            />
            {/* Le numéro passe en Citron sur le point de départ : c'est là que
                le regard doit tomber en premier, et le filet seul ne suffit pas. */}
            <text
              x={x + 14}
              y={y + 39}
              className="font-mono text-[13px]"
              fill={depart ? "var(--color-accent)" : "var(--color-muted)"}
            >
              {etape.numero}
            </text>
            <text x={x + 44} y={y + 31} className="fill-ink text-[13.5px] font-semibold">
              {couper(etape.role, 42)}
            </text>
            <text x={x + 44} y={y + 47} className="fill-muted font-mono text-[11px]">
              {etape.fichierDeclare} · {etape.present ? `${etape.lignes} l.` : "fichier absent"}
            </text>
            {etape.arretDur && (
              <text
                x={x + BLOC.largeur - 14}
                y={y + 39}
                textAnchor="end"
                className="fill-danger font-mono text-[11px]"
              >
                ■ arrêt dur
              </text>
            )}
          </g>
          </Ouvrable>
        ))}

        {plan.satellites.map((satellite) => (
          <Ouvrable key={satellite.id} vers={destinations?.[satellite.id]}>
          <g
            tabIndex={destinations?.[satellite.id] ? undefined : 0}
            role="listitem"
            aria-label={`${satellite.nom}, utilisé par ${satellite.appelePar.length} étape(s)`}
            style={{ opacity: vif(satellite.id) ? 1 : ESTOMPE, transition: FONDU }}
            className={destinations?.[satellite.id] ? "cursor-pointer" : "cursor-default"}
            onMouseEnter={() => setVise(satellite.id)}
            onFocus={() => setVise(satellite.id)}
            onBlur={() => setVise(null)}
          >
            <rect
              x={satellite.x}
              y={satellite.y}
              width={SATELLITE.largeur}
              height={SATELLITE.hauteur}
              rx={16}
              style={{ strokeWidth: vise === satellite.id ? 2 : 1, transition: FONDU }}
              fill={satellite.sorte === "agent" ? "rgba(125,211,252,0.08)" : "rgba(240,232,214,0.05)"}
              stroke={satellite.sorte === "agent" ? "rgba(125,211,252,0.35)" : "rgba(240,232,214,0.22)"}
            />
            <g
              transform={`translate(${satellite.x + 12} ${satellite.y + 10})`}
              fill="none"
              stroke={satellite.sorte === "agent" ? "var(--color-sky)" : "var(--color-muted)"}
              strokeWidth={3.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Le tracé est sur une grille de 24 : ramené à 12 px, le trait
                  doit être multiplié d'autant pour rester à 1,8 à l'écran. */}
              <path
                transform="scale(0.5)"
                d={
                  satellite.sorte === "agent"
                    ? "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0"
                    : "m5 17 6-6-6-6M13 19h7"
                }
              />
            </g>
            <text
              x={satellite.x + 31}
              y={satellite.y + 21}
              className="font-mono text-[12px]"
              fill={satellite.sorte === "agent" ? "var(--color-sky)" : "var(--color-muted)"}
            >
              {satellite.sorte === "competence" ? `/${satellite.nom}` : satellite.nom}
            </text>
            {vise === satellite.id && (
              <text
                x={satellite.x + SATELLITE.largeur + 10}
                y={satellite.y + 21}
                className="fill-muted font-mono text-[11px]"
              >
                utilisé par {satellite.appelePar.length} étape
                {satellite.appelePar.length > 1 ? "s" : ""}
              </text>
            )}
            {/* Le chevron d'ouverture, comme dans la maquette : il dit que le
                satellite mène quelque part, sans attendre le survol. */}
            {destinations?.[satellite.id] && (
              <g
                transform={`translate(${satellite.x + SATELLITE.largeur - 23} ${satellite.y + 10})`}
                fill="none"
                stroke={satellite.sorte === "agent" ? "var(--color-sky)" : "var(--color-muted)"}
                strokeWidth={3.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
              >
                <path transform="scale(0.5)" d="M7 17 17 7M8 7h9v9" />
              </g>
            )}
          </g>
          </Ouvrable>
        ))}
      </svg>
    </div>
  );
}

/**
 * Un vrai lien SVG quand l'élément mène quelque part, rien sinon.
 *
 * `<a>` et non un `onClick` : le clic milieu, le menu contextuel et la
 * tabulation continuent de marcher, et l'élément est annoncé comme un lien.
 * Un `onClick` aurait fabriqué un faux bouton qu'aucun clavier n'atteint.
 */
function Ouvrable({
  vers,
  surClic,
  children,
}: {
  vers?: string;
  surClic?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  if (!vers) return <>{children}</>;
  return (
    <a href={vers} onClick={surClic} className="focus-visible:outline-accent">
      {children}
    </a>
  );
}

/**
 * Le décalage visuel pendant un glisser.
 *
 * Le bloc pris suit le curseur ; ceux qu'il enjambe se poussent d'un cran. On
 * ne redessine pas le plan à chaque pixel : ce serait recalculer onze positions
 * et autant d'arêtes soixante fois par seconde pour un aperçu.
 */
function decalage(
  index: number,
  glisse: { id: string; de: number; vers: number } | null,
  pas: number,
): string | undefined {
  if (!glisse) return undefined;
  if (index === glisse.de) return `translate(0 ${(glisse.vers - glisse.de) * pas})`;
  if (glisse.de < index && index <= glisse.vers) return `translate(0 ${-pas})`;
  if (glisse.vers <= index && index < glisse.de) return `translate(0 ${pas})`;
  return undefined;
}

function Trait({ lien, vif }: { lien: Lien; vif: boolean }) {
  const opacite = vif ? 1 : ESTOMPE;

  if (lien.sorte === "sequence") {
    return (
      <line
        x1={lien.de.x}
        y1={lien.de.y}
        x2={lien.vers.x}
        y2={lien.vers.y}
        style={{ opacity: opacite, transition: FONDU }}
        className="stroke-muted"
        strokeWidth={1.5}
        strokeDasharray={lien.confirme ? undefined : "4 4"}
        markerEnd="url(#pointe)"
      />
    );
  }

  const courbure = (lien.vers.x - lien.de.x) / 2;
  return (
    <path
      d={`M${lien.de.x},${lien.de.y} C${lien.de.x + courbure},${lien.de.y} ${lien.vers.x - courbure},${lien.vers.y} ${lien.vers.x},${lien.vers.y}`}
      style={{ opacity: opacite, strokeWidth: vif ? 1.5 : 1, transition: FONDU }}
      stroke="rgba(240,232,214,0.15)"
      fill="none"
    />
  );
}

function couper(texte: string, maximum: number): string {
  return texte.length <= maximum ? texte : `${texte.slice(0, maximum - 1)}…`;
}

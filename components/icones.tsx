/**
 * Le jeu d'icônes de la charte.
 *
 * Grille 24 px, trait 1,6, extrémités et jonctions rondes, pas de remplissage.
 * Une icône n'a jamais sa propre couleur : elle hérite de l'encre du texte qui
 * l'accompagne. Colorer une icône se fait donc en teintant son parent, jamais
 * en passant une couleur ici.
 *
 * Le trait passe à 2 sous 14 px : à cette taille un 1,6 se dissout, et une
 * icône qu'on ne distingue plus ne vaut pas la place qu'elle prend.
 */
const TRACES = {
  "vue-d-ensemble": "M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z",
  competences: "M12 3l9 5-9 5-9-5 9-5ZM3 13l9 5 9-5",
  workflows: "M4 4h6v6H4ZM14 14h6v6h-6ZM10 7h4a3 3 0 0 1 3 3v4",
  agents: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0",
  reglages: "M4 6h10M18 6h2M16 4v4M4 12h4M12 12h8M10 10v4M4 18h12M19 18h1M17 16v4",
  veille: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 20a2 2 0 0 0 4 0",
  permissions: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z",
  hooks: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  dossier: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  retour: "M19 12H5M11 18l-6-6 6-6",
  fermer: "M18 6 6 18M6 6l12 12",
  envoyer: "M12 19V5M5 12l7-7 7 7",
  valider: "M20 6 9 17l-5-5",
  editer: "M17 3l4 4L8 20l-5 1 1-5 13-13z",
  "arret-dur": "M7 7h10v10H7z",
  etapes: "M4 6h16M4 12h16M4 18h10",
  ajouter: "M12 5v14M5 12h14",
  retirer: "M5 12h14",
  alerte: "M12 3 2.5 20h19L12 3ZM12 10v4M12 17v.5",
  "a-la-main": "M7 11 12 6l5 5M12 6v12",
  brancher: "M9 7V4m6 3V4M7 7h10v5a5 5 0 0 1-10 0V7Zm5 10v3",
  "creer-agent": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 11-5.7M17 15v6m3-3h-6",
  externe: "M7 17 17 7M8 7h9v9",
  commande: "m5 17 6-6-6-6M13 19h7",
  numeroter: "M4 6h1v4M4 10h2M6 18H4l2-3H4M11 6h9M11 12h9M11 18h9",
} as const;

export type NomIcone = keyof typeof TRACES | "proposer" | "silence" | "chercher" | "oeil";

/** Les icônes que le tracé seul ne suffit pas à décrire. */
const COMPOSEES: Partial<Record<string, React.ReactNode>> = {
  proposer: (
    <>
      <path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  silence: (
    <>
      <path d="M8.7 3.6A6 6 0 0 1 18 8c0 2.3.4 3.9.9 5M6.3 6.3C6.1 6.8 6 7.4 6 8c0 4.5-2 6-2 6h12M10 18a2 2 0 0 0 4 0" />
      <path d="M3 3l18 18" />
    </>
  ),
  chercher: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  oeil: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
};

export function Icone({
  nom,
  taille = 16,
  trait,
  classe,
}: {
  nom: NomIcone;
  taille?: number;
  /** À ne forcer que pour un contrepoint voulu — la charte décide sinon. */
  trait?: number;
  classe?: string;
}) {
  const contenu = COMPOSEES[nom] ?? <path d={TRACES[nom as keyof typeof TRACES]} />;
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      fill="none"
      stroke="currentColor"
      strokeWidth={trait ?? (taille < 14 ? 2 : 1.6)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={classe}
      style={{ flex: "none" }}
    >
      {contenu}
    </svg>
  );
}

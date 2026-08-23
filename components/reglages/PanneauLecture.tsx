import Link from "next/link";
import { PastillePortee } from "@/components/primitives";

/**
 * Les deux dossiers qu'Orcha inventorie.
 *
 * Ils ne se changent pas ici : le projet regardé se choisit sur la vue
 * d'ensemble, là où on voit ce que le choix change. Un second sélecteur dans
 * les réglages ferait deux endroits pour un seul réglage.
 */
export function PanneauLecture({
  racineUtilisateur,
  racineProjet,
}: {
  racineUtilisateur: string;
  racineProjet: string | null;
}) {
  return (
    <section className="card px-6 py-[22px]">
      <span className="text-module font-semibold">Lecture</span>
      <p className="mt-1.5 mb-3.5 text-description text-muted">
        Les deux dossiers qu&apos;Orcha inventorie. Il les lit, il n&apos;y écrit que depuis
        l&apos;éditeur.
      </p>
      <div className="flex flex-col gap-2">
        <Racine portee="utilisateur" chemin={racineUtilisateur} />
        <Racine portee="projet" chemin={racineProjet} changeable />
      </div>
    </section>
  );
}

function Racine({
  portee,
  chemin,
  changeable,
}: {
  portee: "utilisateur" | "projet";
  chemin: string | null;
  changeable?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-controle border border-line bg-paper px-3.5 py-2.5">
      <PastillePortee portee={portee}>{portee}</PastillePortee>
      <span className={`min-w-0 truncate font-mono text-meta-lg ${chemin ? "text-ink" : "text-danger"}`}>
        {chemin ?? "aucun projet lu"}
      </span>
      {changeable && (
        <Link
          href="/"
          className="ml-auto shrink-0 text-description font-medium text-muted underline underline-offset-[3px] hover:text-ink"
        >
          changer
        </Link>
      )}
    </div>
  );
}

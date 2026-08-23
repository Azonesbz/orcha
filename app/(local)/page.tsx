import { ChoixProjet } from "@/components/ChoixProjet";
import { EnteteEcran } from "@/components/EnteteEcran";
import { TableauDeBord } from "@/components/TableauDeBord";
import { resumer } from "@/lib/resume";
import { lireAtelier } from "@/lib/lecture/atelier";
import { lireChoix } from "@/lib/lecture/choix";
import { listerProjetsConnus } from "@/lib/lecture/projets";
import { lireVeille } from "@/lib/lecture/veille";

export const dynamic = "force-dynamic";

export default function Accueil() {
  const atelier = lireAtelier();
  const veille = lireVeille();

  return (
    <main>
      <EnteteEcran
        surtitre="tableau de bord"
        titre="Vue d'ensemble"
        intro="Ce qui charge réellement dans tes sessions, et ce qui est présent mais sans effet."
      />

      {/* La ligne de contexte : ce qui est lu, et de quel projet. Les deux
          chemins portent la teinte de leur portée — c'est la même grammaire
          que les pastilles, et elle se lit sans légende. */}
      <section className="card mb-5 flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4">
        <Racine etiquette="réglages personnels" chemin={atelier.racineUtilisateur} teinte="text-sky" />
        {atelier.racineProjet ? (
          <Racine etiquette="projet lu" chemin={atelier.racineProjet} teinte="text-accent-soft" />
        ) : (
          <Racine etiquette="projet lu" chemin="aucun — choisis-en un ci-contre" teinte="text-danger" />
        )}
        <ChoixProjet
          connus={listerProjetsConnus()}
          actuel={lireChoix()}
          impose={process.env.ATELIER_PROJET ?? null}
        />
      </section>

      <TableauDeBord
        avec={resumer(atelier, true)}
        sans={resumer(atelier, false)}
        racineUtilisateur={atelier.racineUtilisateur}
        veilleInstallee={veille.installe}
      />
    </main>
  );
}

function Racine({
  etiquette,
  chemin,
  teinte,
}: {
  etiquette: string;
  chemin: string;
  teinte: string;
}) {
  return (
    <div className="min-w-0">
      <div className="etiquette mb-[3px]">{etiquette}</div>
      <div className={`truncate font-mono text-meta-lg ${teinte}`}>{chemin}</div>
    </div>
  );
}

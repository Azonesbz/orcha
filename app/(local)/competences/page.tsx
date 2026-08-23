import { EnteteEcran } from "@/components/EnteteEcran";
import { Inventaire } from "@/components/Inventaire";
import { socle } from "@/lib/page-atelier";

export const dynamic = "force-dynamic";

export default function Page() {
  const { atelier, aDesEtapes } = socle();
  return (
    <main>
      <EnteteEcran
        surtitre="inventaire"
        titre="Compétences"
        intro="Ce que Claude peut charger, et d'où ça vient. Clique un nom pour le modifier."
        serre
      />
      <Inventaire atelier={atelier} aDesEtapes={aDesEtapes} sections={["competences"]} />
    </main>
  );
}

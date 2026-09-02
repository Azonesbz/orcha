import { CreationCommande } from "./Creation";
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
        titre="Agents et commandes"
        intro="Les agents sont choisis par Claude d'après leur description ; les commandes, tapées par toi."
        serre
      />
      <div className="mb-6 flex flex-wrap gap-2.5">
        <CreationCommande />
      </div>

      <Inventaire atelier={atelier} aDesEtapes={aDesEtapes} sections={["agents", "commandes"]} />
    </main>
  );
}

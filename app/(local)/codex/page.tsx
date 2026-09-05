import { EnteteEcran } from "@/components/EnteteEcran";
import { Conversion } from "@/components/codex/Conversion";
import { InventaireCodex } from "@/components/codex/InventaireCodex";
import { Lecture } from "@/components/codex/Lecture";
import { planifierConversion, type PlanConversion } from "@/lib/ecriture/codex/plan";
import { lireAtelierCodex } from "@/lib/lecture/codex/atelier";

export const dynamic = "force-dynamic";

export default function Page() {
  const atelier = lireAtelierCodex();
  return (
    <main>
      <EnteteEcran
        surtitre="inventaire"
        titre="Codex"
        intro="Ce que ton dossier .codex déclare, et ce qui charge vraiment — lu aux endroits où Codex range les choses."
        serre
      />
      <div className="mb-10 flex max-w-[45rem] flex-col gap-5">
        <Lecture atelier={atelier} />
        {plans().map((plan) => (
          <Conversion key={plan.portee} plan={plan} />
        ))}
      </div>
      <InventaireCodex atelier={atelier} />
    </main>
  );
}

/** Le plan du projet n'existe que s'il y a un projet lu : sans lui, un seul plan. */
function plans(): PlanConversion[] {
  const trouves = [planifierConversion("utilisateur")];
  try {
    trouves.push(planifierConversion("projet"));
  } catch {
    // Aucun projet lu : rien à convertir de ce côté, et ce n'est pas une erreur.
  }
  return trouves;
}

import { EnteteEcran } from "@/components/EnteteEcran";
import { Veille } from "@/components/Veille";
import { lireVeille } from "@/lib/lecture/veille";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main>
      <EnteteEcran
        surtitre="démarrage"
        titre="Veille au démarrage"
        intro="Le hook qui prévient, à l'ouverture d'une session, de ce qui est déclaré mais sans effet."
      />
      <Veille veille={lireVeille()} />
    </main>
  );
}

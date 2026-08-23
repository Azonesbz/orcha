import { EnteteEcran } from "@/components/EnteteEcran";
import { Inventaire } from "@/components/Inventaire";
import { PanneauClaude } from "@/components/reglages/PanneauClaude";
import { PanneauLecture } from "@/components/reglages/PanneauLecture";
import { socle } from "@/lib/page-atelier";
import { lireConfig, masquer } from "@/lib/reglages/config";
import { ilYA } from "@/lib/reglages/duree";

export const dynamic = "force-dynamic";

export default function Page() {
  const { atelier, aDesEtapes } = socle();
  const config = lireConfig();

  return (
    <main>
      <EnteteEcran titre="Réglages" chemin="~/.orcha/config.json" />

      {/* La clé et les dossiers d'abord : ce sont les seuls réglages qu'Orcha
          possède. Tout ce qui suit est un inventaire de ce que Claude Code
          déclare — on le lit, on ne le règle pas ici. */}
      <div className="mb-10 flex max-w-[45rem] flex-col gap-5">
        <PanneauClaude
          cleMasquee={masquer(config.cleApi)}
          modele={config.modele}
          etatCle={etatDeLaCle(config.cleApi, config.verifieeLe)}
        />
        <PanneauLecture
          racineUtilisateur={atelier.racineUtilisateur}
          racineProjet={atelier.racineProjet}
        />
      </div>

      <Inventaire
        atelier={atelier}
        aDesEtapes={aDesEtapes}
        sections={["plugins", "hooks", "permissions", "instructions"]}
      />
    </main>
  );
}

/** Ce que le serveur sait de la clé — l'écran, lui, n'en connaît que le masque. */
function etatDeLaCle(cleApi: string, verifieeLe: string): { valide: boolean; texte: string } {
  if (cleApi === "") return { valide: false, texte: "aucune clé — le panneau Claude est éteint" };

  const quand = ilYA(verifieeLe, new Date());
  if (quand === "") return { valide: false, texte: "clé enregistrée · jamais vérifiée" };
  return { valide: true, texte: `clé valide · vérifiée ${quand} via GET /v1/models` };
}

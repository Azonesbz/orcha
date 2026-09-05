import { Icone, type NomIcone } from "@/components/icones";
import type { Module } from "@/lib/modules/decoupe";

/**
 * Un module du fichier, en lecture seule.
 *
 * Rien ne se modifie à la main ici : l'écriture passe par l'agent. Ce que ces
 * cartes font, c'est rendre le fichier lisible — une liste numérotée se lit
 * comme une liste, pas comme du Markdown dans un textarea.
 *
 * L'étiquette de droite dit d'où vient le module dans le fichier. C'est elle
 * qui permet de vérifier ce qu'Orcha a compris sans ouvrir l'éditeur de texte.
 */
export function ModuleFichier({ module }: { module: Module }) {
  return (
    <section className="card px-5 py-[18px]">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="text-accent">
          <Icone nom={iconeDe(module)} taille={15} />
        </span>
        <span className="text-module font-semibold">{module.titre}</span>
        {module.forme === "liste" && (
          <span className="font-mono text-meta-lg text-muted">{module.entrees.length}</span>
        )}
        <span className="ml-auto font-mono text-[10.5px] text-faint">{module.origine}</span>
      </div>

      {module.forme === "liste" ? (
        <div className="flex flex-col gap-2">
          {module.entrees.map((entree, i) => (
            <Entree key={i} rang={i} texte={entree} />
          ))}
        </div>
      ) : (
        <Prose module={module} />
      )}
    </section>
  );
}

function Entree({ rang, texte }: { rang: number; texte: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-controle border border-line bg-paper px-3 py-2.5">
      <span className="w-5 shrink-0 font-mono text-meta text-muted">{String(rang + 1).padStart(2, "0")}</span>
      <span className="flex-1 text-corps">{texte}</span>
    </div>
  );
}

/**
 * Un module de prose. L'arrêt dur porte sa marque : c'est le seul module dont
 * l'effet est un comportement du modèle, pas un contenu à lire.
 */
function Prose({ module }: { module: Module }) {
  const estArret = /arr[êe]t/i.test(module.titre);
  return (
    <div className="flex items-baseline gap-3 rounded-controle border border-line bg-paper px-3 py-2.5">
      {estArret && <span className="shrink-0 font-mono text-meta text-accent">■ actif</span>}
      <p className="flex-1 whitespace-pre-wrap text-corps">{module.texte}</p>
    </div>
  );
}

function iconeDe(module: Module): NomIcone {
  if (/arr[êe]t/i.test(module.titre)) return "arret-dur";
  if (module.forme === "liste") return "etapes";
  return "competences";
}

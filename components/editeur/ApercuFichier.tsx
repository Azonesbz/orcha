import { lignesNouvelles } from "@/lib/modules/difference";

/**
 * L'aperçu du fichier tel qu'il sera écrit.
 *
 * C'est la contrepartie du découpage en modules : les modules disent ce qu'on
 * a compris, l'aperçu montre ce qui atterrira sur le disque. Sans lui, une
 * proposition acceptée serait un pari.
 *
 * La surbrillance marque les lignes nouvelles à leur place dans le fichier —
 * pas dans un diff à côté, qu'il faudrait relire deux fois pour situer.
 */
export function ApercuFichier({
  nomFichier,
  texte,
  original,
}: {
  nomFichier: string;
  /** Le fichier entier, frontmatter compris, tel qu'il sera écrit. */
  texte: string;
  /** Le fichier sur le disque. Identique à `texte` s'il n'y a pas de proposition. */
  original: string;
}) {
  const lignes = texte.split("\n");
  const nouvelles = new Set(lignesNouvelles(original, texte));

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-3.5">
        <span className="etiquette">aperçu · {nomFichier}</span>
        {nouvelles.size > 0 && (
          <span className="ml-auto font-mono text-[10.5px] text-accent-soft">
            proposition en surbrillance
          </span>
        )}
      </div>
      <pre className="max-h-[32rem] overflow-auto px-[18px] py-4 font-mono text-meta leading-[1.75] break-words whitespace-pre-wrap text-ink-soft">
        {lignes.map((ligne, i) => (
          <Ligne key={i} texte={ligne} nouvelle={nouvelles.has(i)} />
        ))}
      </pre>
      <p className="border-t border-line px-[18px] py-3 font-mono text-etiquette leading-[1.7] text-faint">
        écrit uniquement à l&apos;application d&apos;une proposition · le frontmatter n&apos;est pas
        touché
      </p>
    </div>
  );
}

const DELIMITEUR = /^---\s*$/;
const CLE = /^([A-Za-z][\w-]*):(.*)$/;
const TITRE = /^#{1,6}\s/;

/** Une ligne d'aperçu, teintée selon ce qu'elle est dans le fichier. */
function Ligne({ texte, nouvelle }: { texte: string; nouvelle: boolean }) {
  const surbrillance = nouvelle ? "bg-accent/12 text-ink" : "";

  if (DELIMITEUR.test(texte)) {
    return <span className={`block text-faint ${surbrillance}`}>{texte}</span>;
  }
  if (TITRE.test(texte)) {
    return <span className={`block text-accent ${surbrillance}`}>{texte}</span>;
  }

  const cle = CLE.exec(texte);
  if (cle) {
    return (
      <span className={`block ${surbrillance}`}>
        <span className="text-muted">{cle[1]}:</span>
        {cle[2]}
      </span>
    );
  }
  return <span className={`block ${surbrillance}`}>{texte || " "}</span>;
}

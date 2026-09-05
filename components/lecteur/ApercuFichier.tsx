/**
 * L'aperçu du fichier tel qu'il est sur le disque.
 *
 * C'est la contrepartie du découpage en modules : les modules disent ce
 * qu'Orcha a compris, l'aperçu montre ce qui est réellement écrit — le
 * frontmatter compris, que les modules ne portent pas.
 */
export function ApercuFichier({ nomFichier, texte }: { nomFichier: string; texte: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-3.5">
        <span className="etiquette">aperçu · {nomFichier}</span>
      </div>
      <pre className="max-h-[32rem] overflow-auto px-[18px] py-4 font-mono text-meta leading-[1.75] break-words whitespace-pre-wrap text-ink-soft">
        {texte.split("\n").map((ligne, i) => (
          <Ligne key={i} texte={ligne} />
        ))}
      </pre>
      <p className="border-t border-line px-[18px] py-3 font-mono text-etiquette leading-[1.7] text-faint">
        tel qu&apos;il est sur le disque · pour le modifier, demande à l&apos;agent
      </p>
    </div>
  );
}

const DELIMITEUR = /^---\s*$/;
const CLE = /^([A-Za-z][\w-]*):(.*)$/;
const TITRE = /^#{1,6}\s/;

/** Une ligne d'aperçu, teintée selon ce qu'elle est dans le fichier. */
function Ligne({ texte }: { texte: string }) {
  if (DELIMITEUR.test(texte)) return <span className="block text-faint">{texte}</span>;
  if (TITRE.test(texte)) return <span className="block text-accent">{texte}</span>;

  const cle = CLE.exec(texte);
  if (cle) {
    return (
      <span className="block">
        <span className="text-muted">{cle[1]}:</span>
        {cle[2]}
      </span>
    );
  }
  return <span className="block">{texte || " "}</span>;
}

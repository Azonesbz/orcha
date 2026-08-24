"use client";

import Markdown from "react-markdown";

/**
 * La réponse de l'agent, rendue en Markdown.
 *
 * Il en produit naturellement — du gras, du `code`, des listes — et le laisser
 * en texte brut affichait les astérisques. `react-markdown` plutôt qu'un rendu
 * maison : le Markdown n'est pas trois expressions régulières, et un rendu
 * partiel laisse des `##` à l'écran dès que le modèle sort du sous-ensemble
 * qu'on avait prévu.
 *
 * Aucun HTML brut n'est interprété — pas de `rehype-raw`, pas de
 * `dangerouslySetInnerHTML`. Ce qui arrive du modèle est du texte, et le reste.
 *
 * Les styles sont posés élément par élément plutôt que par une classe `prose` :
 * la charte a ses propres corps et interlignes, et un thème typographique
 * générique les écraserait.
 */
export function Prose({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-2.5 text-note leading-[1.7] text-ink-soft">
      <Markdown
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-accent-soft underline decoration-accent/40 underline-offset-[3px]"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-badge bg-accent-wash px-1.5 py-0.5 font-mono text-meta text-accent-soft">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-controle border border-line bg-paper p-3 font-mono text-meta leading-[1.7]">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="flex flex-col gap-1 pl-4">{children}</ul>,
          ol: ({ children }) => (
            <ol className="flex list-decimal flex-col gap-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="marker:text-muted">{children}</li>,
          h1: ({ children }) => <h3 className="text-section font-semibold text-ink">{children}</h3>,
          h2: ({ children }) => <h3 className="text-section font-semibold text-ink">{children}</h3>,
          h3: ({ children }) => <h4 className="text-note font-semibold text-ink">{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-line-soft pl-3 text-muted">{children}</blockquote>
          ),
          hr: () => <hr className="border-line" />,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

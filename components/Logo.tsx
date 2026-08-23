/**
 * La paire — le logo d'Orcha.
 *
 * Deux cercles côte à côte : le plein est ce qui charge, le contour est ce qui
 * n'est que déclaré. Le logo dit la fonction d'Orcha — poser les deux l'un à
 * côté de l'autre et comparer. Inverser le plein et le contour change le sens ;
 * recolorer le contour est un interdit de charte.
 */
export function Paire({ taille = 22 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden style={{ flex: "none" }}>
      <circle cx="8" cy="12" r="5" fill="#a3e635" />
      {/* Le trait épaissit sous 16 px, sinon le contour disparaît. */}
      <circle
        cx="17.5"
        cy="12"
        r="4"
        fill="none"
        stroke="#f3eedf"
        strokeWidth={taille < 16 ? 2.2 : 1.8}
      />
    </svg>
  );
}

/** La paire et le logotype. Le corps du texte vaut deux fois le diamètre. */
export function Logo({ taille = 22 }: { taille?: number }) {
  return (
    <span className="flex items-center gap-[9px]">
      <Paire taille={taille} />
      <span className="text-marque font-bold tracking-[-0.01em]">Orcha</span>
    </span>
  );
}

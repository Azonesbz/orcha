/**
 * Un champ de la charte : l'étiquette, l'aide, puis le contrôle.
 *
 * L'aide est au-dessus du champ et non en dessous : elle sert à décider quoi
 * saisir, elle doit donc être lue avant, pas après.
 */
export function Champ({
  etiquette,
  aide,
  children,
  classe,
}: {
  etiquette: string;
  aide?: string;
  children: React.ReactNode;
  classe?: string;
}) {
  return (
    <label className={`block ${classe ?? ""}`}>
      <span className="text-note font-semibold">{etiquette}</span>
      {aide && <span className="mt-0.5 mb-1.5 block text-description text-muted">{aide}</span>}
      {!aide && <span className="block h-1.5" />}
      {children}
    </label>
  );
}

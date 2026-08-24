"use client";

import { useActionState, useState } from "react";
import { Champ } from "@/components/Champ";
import { Icone } from "@/components/icones";
import { appliquerReglages, type RetourReglages } from "@/app/(local)/reglages/actions";
import { MODELES } from "@/lib/reglages/modeles";

const VIERGE: RetourReglages = { etat: "vierge", message: "" };

/**
 * La clé d'API, et ce qu'elle ouvre.
 *
 * La clé n'est jamais renvoyée au navigateur : l'écran n'en connaît que la
 * forme masquée. Un champ laissé vide ne l'efface donc pas — c'est le bouton
 * « Oublier la clé » qui la retire, et lui seul.
 */
export function PanneauClaude({
  cleMasquee,
  modele,
  etatCle,
}: {
  cleMasquee: string;
  modele: string;
  /** Ce que le serveur sait de la clé, déjà mis en phrase. */
  etatCle: { valide: boolean; texte: string };
}) {
  const [retour, action, enCours] = useActionState(appliquerReglages, VIERGE);
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="card flex flex-col gap-4 px-6 py-[22px]">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="text-accent">
            <Icone nom="proposer" taille={16} />
          </span>
          <span className="text-module font-semibold">Claude</span>
        </div>
        <p className="mt-1.5 text-description text-muted">
          Utilisé par « Modifier avec Claude ». <strong className="text-ink">Facultatif</strong> :
          sans clé, Orcha passe par la commande <code className="font-mono">claude</code> de cette
          machine, donc par ton abonnement Claude Code. Une clé enregistrée gagne, et facture à
          l&apos;usage.
        </p>
      </div>

      <Champ
        etiquette="Clé API"
        aide="Créée sur console.anthropic.com. Vide = on utilise ton abonnement Claude Code."
      >
        <div className="flex gap-2.5">
          <input
            name="cleApi"
            type={visible ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder={cleMasquee || "sk-ant-…"}
            className="field flex-1 font-mono text-description tracking-[0.08em]"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="btn-secondary min-h-0 px-3.5 py-0 text-description"
          >
            <Icone nom="oeil" taille={14} />
            {visible ? "Masquer" : "Afficher"}
          </button>
        </div>
        <span
          className={`mt-2 inline-flex items-center gap-[7px] font-mono text-meta ${
            etatCle.valide ? "text-accent-soft" : "text-muted"
          }`}
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${etatCle.valide ? "bg-accent" : "bg-muted"}`}
          />
          {etatCle.texte}
        </span>
      </Champ>

      <Champ etiquette="Modèle par défaut" classe="max-w-80">
        <select
          name="modele"
          defaultValue={modele}
          className="w-full rounded-lg border border-line-strong bg-paper px-2.5 py-2.5 font-mono text-[11.5px] text-ink"
        >
          {MODELES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Champ>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="intention"
          value="enregistrer"
          disabled={enCours}
          className="btn-primary"
        >
          <Icone nom="valider" taille={14} trait={2.2} />
          {enCours ? "Écriture…" : "Enregistrer"}
        </button>
        <button
          type="submit"
          name="intention"
          value="tester"
          disabled={enCours}
          className="btn-secondary"
        >
          Tester la connexion
        </button>
        {cleMasquee && (
          <button type="submit" name="intention" value="oublier" disabled={enCours} className="btn-ghost">
            Oublier la clé
          </button>
        )}
        {retour.etat !== "vierge" && (
          <span
            role={retour.etat === "refuse" ? "alert" : "status"}
            className={`font-mono text-meta ${retour.etat === "refuse" ? "text-danger" : "text-accent-soft"}`}
          >
            {retour.message}
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * Le seul endroit qui lance le CLI `claude`.
 *
 * `spawn` et non `execFile`, pour une raison précise : `claude -p` attend des
 * données sur stdin s'il n'est pas fermé. `execFile` n'expose pas `stdio`, le
 * processus patientait donc trois secondes avant d'échouer. Ici stdin est
 * ignoré d'emblée — l'équivalent du `< /dev/null` que le CLI suggère lui-même.
 */

import { spawn } from "node:child_process";

export interface Lancement {
  args: string[];
  cwd: string;
  /** Un agent qui construit un workflow entier prend son temps. */
  delai: number;
}

export function lancerClaude({ args, cwd, delai }: Lancement): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    // stdin « ignore » : c'est LE correctif. Sans lui, le CLI attend une entrée
    // qui ne viendra jamais.
    const enfant = spawn("claude", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });

    let sortie = "";
    let erreurs = "";
    enfant.stdout.on("data", (bloc) => (sortie += bloc));
    enfant.stderr.on("data", (bloc) => (erreurs += bloc));

    const minuterie = setTimeout(() => enfant.kill("SIGTERM"), delai);

    enfant.on("error", (erreur) => {
      clearTimeout(minuterie);
      rejeter(new Error(erreur.message));
    });

    enfant.on("close", (code) => {
      clearTimeout(minuterie);
      if (code === 0) return resoudre(sortie);
      rejeter(new Error(messageDEchec(`${erreurs}\n${sortie}`, code)));
    });
  });
}

/* L'avertissement de stdin apparaît même quand tout se passe bien : le
   rapporter comme la cause enverrait chercher au mauvais endroit. */
const BRUIT = [/^Command failed:/, /^Warning: no stdin data received/, /^\s*$/];

/**
 * Ce qu'on montre d'un échec.
 *
 * L'erreur brute d'un `child_process` recopie toute la ligne de commande —
 * donc l'invite entière, donc le fichier qu'on venait de donner à lire. On ne
 * garde que ce qui explique.
 */
export function messageDEchec(brut: string, code: number | null): string {
  const utiles = brut
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !BRUIT.some((motif) => motif.test(l)))
    // Ce qui suit « Command failed: » est l'argumentaire recopié, pas une cause.
    .filter((l) => !l.startsWith("--") && !l.startsWith("claude -p"));

  const cause = utiles.slice(-4).join(" ").trim();
  return cause || `Le CLI « claude » s'est arrêté avec le code ${code ?? "inconnu"}.`;
}

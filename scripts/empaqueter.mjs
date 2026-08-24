#!/usr/bin/env node
/**
 * Assemble le paquet npm publiable, à partir du build autonome.
 *
 * Ce qui part sur npm est **le rôle local uniquement**. Il n'y a plus aucun
 * secret à en écarter depuis que le produit est libre : ni compte, ni
 * paiement, ni clé d'aucune sorte. `ATELIER_PUBLIC` n'y est pas posé, donc les
 * pages du site public n'existent pas dans le paquet.
 *
 * La purge reste, et elle est toujours indispensable : Next trace TOUT le
 * projet dans le build autonome — `lib/lecture/reglages.ts` lit des chemins
 * dynamiques et l'analyse statique renonce.
 */

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* Next trace TOUT le projet dans le build autonome — `lib/lecture/reglages.ts`
   lit des chemins dynamiques, et l'analyse statique renonce. Le .env.production
   s'y retrouve donc, avec les clés live. Purger n'est pas une précaution de
   confort : sans ça, `npm publish` diffuse les secrets du service. */
const INTERDITS = [
  /^\.env/, /\.test\.[tj]s$/, /^\.git$/, /^\.claude$/, /^\.atelier-/,
  /^__pycache__$/,
  // Les tests Python partent ; `hook.py` et les trois modules qu'il importe
  // RESTENT. Une purge de tous les `.py` retirait le hook de veille, alors que
  // l'onglet Veille donne son chemin à coller dans settings.json : la commande
  // pointait vers un fichier absent du paquet, et le hook échouait à chaque
  // session sans que personne ne sache pourquoi.
  /^test_.*\.py$/,
  // Les sources ne sont pas exécutées — le serveur autonome tourne sur les
  // chunks compilés. Les garder alourdit le paquet et laisse croire qu'on
  // distribue le dépôt.
  /^docs$/, /^scripts$/, /^atelier-claude$/, /^deployer\.sh$/, /^compose\.yaml$/,
  // La publication précédente, que le traçage de Next ramasse dans le dossier
  // de travail. Sans cette ligne chaque version embarque la précédente, qui
  // embarquait la sienne : 4,2 Mo en 0.2.0, 7,5 Mo en 0.3.0, et ça double.
  /^paquet$/, /^charte$/, /^\.ds-sync$/, /^ds-bundle$/, /^\.design-sync$/,
  /^Dockerfile$/, /^proxy\.ts$/, /^next-env\.d\.ts$/, /^tsconfig\.json$/,
  /^postcss\.config\.mjs$/, /^next\.config\.ts$/, /^tsconfig\.tsbuildinfo$/,
];

function purger(dossier) {
  let retires = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (INTERDITS.some((motif) => motif.test(nom))) {
      rmSync(chemin, { recursive: true, force: true });
      retires.push(chemin);
      continue;
    }
    if (statSync(chemin).isDirectory() && nom !== "node_modules") {
      retires = retires.concat(purger(chemin));
    }
  }
  return retires;
}

const RACINE = process.cwd();
const SORTIE = join(RACINE, "paquet");
const app = JSON.parse(readFileSync(join(RACINE, "package.json"), "utf8"));

rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(SORTIE, { recursive: true });

/* La purge ci-dessous rattrape ce qui a été copié ; elle ne peut rien contre
   ce que `next build` a déjà tracé. Vider `paquet/` AVANT de compiler est la
   seule vraie parade — d'où l'ordre du script `empaqueter` : `next build`
   d'abord, puis ce fichier. Si un paquet traîne du build précédent, il est
   dans le standalone, et seule la purge l'en sort. */

// Le serveur autonome et ses ressources.
cpSync(join(RACINE, ".next/standalone"), SORTIE, { recursive: true });
cpSync(join(RACINE, ".next/static"), join(SORTIE, ".next/static"), { recursive: true });
cpSync(join(RACINE, "public"), join(SORTIE, "public"), { recursive: true });
mkdirSync(join(SORTIE, "bin"), { recursive: true });
cpSync(join(RACINE, "bin/orcha.mjs"), join(SORTIE, "bin/orcha.mjs"));

// Un manifeste propre : ni scripts de développement, ni dépendances — le
// serveur autonome embarque déjà ce dont il a besoin.
writeFileSync(
  join(SORTIE, "package.json"),
  `${JSON.stringify(
    {
      name: "orcha-cli",
      repository: { type: "git", url: "git+https://github.com/Azonesbz/orcha.git" },
      version: app.version,
      description: "Voir ce que ton dossier .claude déclare, et ce qui charge vraiment.",
      bin: { orcha: "bin/orcha.mjs" },
      // Surtout PAS `type: module` : le server.js de Next est en CommonJS et
      // refuserait de démarrer. Le lanceur est en .mjs, il s'en passe.
      license: "MIT",
      engines: { node: ">=20" },
      /* npm exclut TOUJOURS node_modules d'un tarball : le serveur autonome
         perdrait ses dépendances et ne démarrerait pas. On les déclare donc,
         aux versions exactes du build — un écart de version entre les chunks
         compilés et le runtime installé casse au démarrage.
         Clerk, Stripe et yaml n'y sont pas : ils sont compilés dans les chunks. */
      dependencies: {
        next: app.dependencies.next.replace(/^[\^~]/, ""),
        react: app.dependencies.react.replace(/^[\^~]/, ""),
        "react-dom": app.dependencies["react-dom"].replace(/^[\^~]/, ""),
      },
      keywords: ["claude", "claude-code", "skills", "agents", "diagnostic"],
      homepage: "https://orcha.vincentavz.com",
      author: "Vincent Avez <vincent.avez22@gmail.com>",
    },
    null,
    2,
  )}\n`,
);

const retires = purger(SORTIE);
if (retires.length) {
  console.log(`Purgé ${retires.length} fichier(s) qui n'ont rien à faire sur npm :`);
  for (const c of retires.slice(0, 8)) console.log(`  ${c.replace(SORTIE, "paquet")}`);
}

cpSync(join(RACINE, "README.md"), join(SORTIE, "README.md"));
cpSync(join(RACINE, "LICENSE"), join(SORTIE, "LICENSE"));
console.log(`Paquet assemblé dans ${SORTIE}`);
// `--prefix` ne change PAS le manifeste que lit npm : il lirait celui de la
// racine, marqué `private`. Il faut se placer dans le dossier.
console.log("Vérifie avec :  cd paquet && npm pack --dry-run");
console.log("Publie avec  :  cd paquet && npm publish --access public");

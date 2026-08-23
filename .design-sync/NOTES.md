# Notes de synchronisation — charte Orcha → claude.ai/design

Projet cible : `838c7425-2b0d-4725-b8a6-895c08a4ddc3`
(https://claude.ai/design/p/838c7425-2b0d-4725-b8a6-895c08a4ddc3)

Cinq primitives montées : `Pastille`, `Silences`, `Entree`, `Liste`, `Panneau`.

## La commande de resynchronisation

Le pilote **n'exécute pas** `cfg.buildCmd`. Il faut donc deux commandes, dans
cet ordre, depuis `projects/Orcha` :

```sh
npm run build --prefix charte
node .ds-sync/resync.mjs --config .design-sync/config.json \
  --node-modules node_modules --out ./ds-bundle \
  --remote .design-sync/.cache/remote-sync.json
```

(Récupérer d'abord le `_ds_sync.json` du projet distant vers
`.design-sync/.cache/remote-sync.json` — sans lui, tout est revérifié.)

## Risques de resynchronisation

- **`--node-modules` doit être `node_modules`, celui de la racine du dépôt.**
  `.ds-sync/node_modules` ne porte que les dépendances du convertisseur et n'a
  pas React : le build s'arrête sur `react not found under --node-modules`.
  Ce n'est pas une clé de config, il faut le passer à chaque fois.

- **`entry` est indispensable** (déjà dans la config :
  `charte/dist/index.mjs`). `@orcha/charte` n'est installé dans aucun
  `node_modules` — c'est un répertoire local, sans workspace. Sans `entry`, le
  convertisseur cherche `node_modules/@orcha/charte/package.json` et meurt sur
  un ENOENT. Si un jour la charte devient un vrai workspace, `entry` pourra
  sauter.

- **La règle de fond doit rester en `html body`**, dans
  `charte/src/charte.css`. Le gabarit de carte de claude.ai/design pose un
  `body { background: #fff }` en ligne ; un sélecteur `body` nu (spécificité
  0,0,1) perd contre lui et tout rend blanc sur blanc. `html body` (0,0,2)
  gagne. C'est le bug qui a coûté le plus cher à la première synchro — ne pas
  « simplifier » ce sélecteur.

- **`tokens/` et `guidelines/` sortent vides, et c'est normal.** Tailwind v4
  compile le bloc `@theme` directement dans `_ds_bundle.css`, que `styles.css`
  importe. La fermeture d'import est donc complète malgré les répertoires
  vides — ne pas chercher à les remplir.

- **Aucun `fonts/`, et c'est correct.** La charte n'emploie que des piles
  système (`system-ui`, `ui-monospace`, `ui-serif`). `--font-body` et
  `--font-display-family` sont les variables de `next/font` : hors de
  l'application elles ne résolvent rien et les replis prennent la main. Si
  `package-validate.mjs` imprime un jour `[FONT_MISSING]`, la cause est là, et
  ce n'est pas une régression.

- **`charte/src/primitives.tsx` est une copie mot pour mot de
  `components/primitives.tsx`**, avec le seul import réécrit vers `./types`.
  Rien ne surveille cette copie : si les primitives de l'application changent,
  la charte dérive en silence. Comparer les deux fichiers avant toute
  resynchronisation.

- **`cardMode: "column"` sur les cinq composants.** Ce sont des rangées de
  liste et des sections, pas des boutons : la disposition en rangée par défaut
  les écrasait.

## Ce qui a été noté à la revue

Les onze cellules des cinq planches ont été notées `good` au barème absolu, du
premier coup après correction du fond. Les axes qui comptent et qu'il faut
préserver dans les aperçus : la troncature d'une origine longue sur `Pastille`,
le compte à zéro avec sa phrase explicative sur `Panneau`, et l'entrée sans
description sur `Entree`.

# Orcha

Voir et modifier un dossier `.claude` sur une page. Interface locale, aucun
compte, aucune base, rien qui sorte de la machine.

```bash
npm install
npm run dev
```

http://localhost:4300 — le serveur n'écoute que sur `127.0.0.1`, et ce n'est
pas un détail : aucune action n'est authentifiée, donc sur `0.0.0.0` n'importe
qui sur le même réseau pourrait réécrire un `SKILL.md` de ton `~/.claude`,
c'est-à-dire déposer des instructions que Claude Code exécuterait à la session
suivante. Ne retire pas `--hostname` des scripts.

Aucune configuration à faire. L'outil lit `~/.claude`, et pour le projet il
suit trois sources dans cet ordre :

1. `ATELIER_PROJET`, si la variable est définie — un lancement explicite reste
   explicite, et l'interface le dit au lieu d'ignorer le sélecteur en silence ;
2. **le projet choisi dans l'interface**, gardé d'une session à l'autre ;
3. la remontée d'arborescence depuis le dossier de lancement, comme le fait
   Claude Code lui-même.

Le sélecteur propose les projets où Claude Code a **réellement travaillé**. La
liste ne vient pas du nom des dossiers de `~/.claude/projects/`, qui est
ambigu — `-Users-vins-workspace-bpm-connect` se lit aussi bien
`workspace/bpm/connect` que `workspace/bpm-connect`, et c'est la seconde qui
est vraie. Elle vient du champ `cwd` des transcriptions, qui ne se devine pas.
Seuls les dossiers portant un `.claude` sont proposés, le plus récent en tête.

Le choix est un fichier `.atelier-choix.json` à côté de l'application, pas un
cookie : les garde-fous d'écriture appellent la même résolution de racine, loin
de toute requête, et doivent voir exactement ce que la page affiche.

`CLAUDE_CONFIG_DIR` vise un autre dossier personnel.

## L'habillage

Direction artistique noire, reprise du portfolio via `academie-ia-dev` — les
mêmes jetons, les mêmes polices, les mêmes utilitaires. Trois principes :
trois noirs séparés d'un ou deux pourcents, la profondeur par un filet de 1 px
en blanc alpha plutôt que par une ombre, et **le blanc comme unique accent**.

Elle est **sombre uniquement** : le thème clair qui existait ici a été retiré.
Deux chartes valent moins qu'une.

Outfit porte le texte, Pacifico ne sert qu'au nom. Les rayons suivent la
surface — 6 px un contrôle, 8 px un bouton, 16 px une carte — et les filets ont
deux forces : 12 % pour le décor, 35 % pour les champs, seuil WCAG 1.4.11.

## Installation

```bash
npx orcha-cli
```

Rien à cloner, rien à configurer. La commande télécharge l'outil, le démarre
sur `127.0.0.1` et ouvre le navigateur. Node 20 ou plus suffit.

Seule exception : la **veille au démarrage** est un script Python, et demande donc
un `python3` sur la machine. Elle est facultative, et l'écran Veille dit s'il est là.

**Libre et gratuit, sous licence MIT.** Ni compte, ni paiement, ni télémétrie :
l'outil lit ton disque et ne parle à personne.

Pour travailler sur le code plutôt que l'utiliser :

```bash
git clone git@github.com:Azonesbz/orcha.git && cd orcha
npm install && npm run dev
```

## Les pages

**Ce n'est pas un site, c'est une application.** Le corps ne défile pas : rail
de navigation fixe à gauche, une seule zone de contenu qui bouge. C'est ce qui
survivra à un empaquetage en logiciel, là où une colonne centrée à grandes
marges gaspillerait la fenêtre. En dessous de `md`, le rail se couche en barre.

La vue d'ensemble est un tableau de bord : le nombre d'éléments sans effet en
tête, huit tuiles chiffrées, la liste de ce qui demande un coup d'œil, et la
répartition de ce qui charge par provenance.

Une case **« inclure les réglages personnels »** écarte tout ce qui vient de
`~/.claude` — ses compétences, ses agents, ses hooks, ses permissions — pour ne
garder que le projet et les plugins. Les deux résumés sont calculés au serveur
et la case bascule de l'un à l'autre : compter les étapes mortes d'un workflow
demande de lire les fichiers d'étapes sur le disque, et refaire ce calcul dans
le navigateur fabriquerait une seconde vérité.

Aucun graphique pour les compteurs : douze compétences et quarante règles de
permission ne se comparent pas, ce sont des objets différents. La seule figure
est la répartition par portée — une barre, trois pas de gris. Le validateur de
palette a refusé le premier jeu (ΔE 11,4 entre deux pas voisins, sous le seuil
de 15 même en vision normale) ; élargi il passe à 27, et chaque segment porte
son étiquette parce que le pas le plus sombre reste sous 3:1.

| Page | Ce qu'on y trouve |
| --- | --- |
| Vue d'ensemble | le verdict, les dossiers lus, le choix du projet |
| Compétences | la liste, et le détail modifiable |
| Workflows | les compétences qui se déroulent en étapes, et leur plan |
| Agents | agents et commandes |
| Réglages | plugins, hooks, permissions, instructions |
| Veille | le hook de démarrage et son bloc à coller |

Sur les pages de liste, une case **« ce projet seulement »** masque tout ce qui
ne vient pas du `.claude` du projet choisi — le personnel, les plugins, le
catalogue. Utile quand on regarde le dossier de quelqu'un d'autre.

## Ce que ça montre

Tout ce qui est chargé, avec sa provenance : compétences, agents, commandes,
hooks, permissions, plugins, fichiers d'instructions. Chaque ligne porte sa
portée — `~/.claude`, le projet, ou un plugin nommé.

Et surtout ce qui est **présent mais sans effet**, la seule chose qu'aucune
commande intégrée ne dit :

| Écart | Règle de détection |
| --- | --- |
| Plugin déclaré, charge utile absente | `enabledPlugins` × `installed_plugins.json` × existence de `installPath` |
| Plugin déclaré, aucune installation | déclaré actif, rien dans `installed_plugins.json` |
| Agent ou commande sans description | le modèle n'a rien pour décider de s'en servir |
| Frontmatter ni lisible en YAML ni en `clé: valeur` | l'élément est ignoré sans un mot |
| Hook à la commande vide | déclaré, n'exécute rien |
| Matcher au mauvais type | invalide le fichier de réglages **entier** |

Deux choses ne sont **pas** comptées comme des écarts, chacune parce qu'un test
contrôlé sur 2.1.227 l'a démenti :

- `disable-model-invocation: true` — c'est un choix, pas une panne. La liste
  l'affiche sans le peindre en rouge.
- un `name` de frontmatter différent du nom de répertoire ou de fichier — un
  répertoire `repertoire-aaa` portant `name: frontmatter-zzz` se présente sous
  `frontmatter-zzz`, et un agent `fichier-bbb.md` portant
  `name: frontmatter-yyy` sous `frontmatter-yyy`. C'est le `name` qui fait
  l'identité, la divergence ne casse rien.

## Les workflows

Certaines compétences se déroulent en étapes numérotées : `halo` en a onze,
`lancer` sept. La page workflow en dresse le plan — des blocs enchaînés, et sur
la droite ce que chaque étape appelle.

**Le nom de la compétence n'est pas un nœud.** C'est le titre de la page ; le
point de départ est une étape, et la page dit laquelle. `halo` la déclare
(« Commence maintenant par lire et exécuter `steps/step-00-init.md` ») ;
`lancer` ne dit rien, et c'est alors la première ligne du tableau qui fait foi
— la page le précise plutôt que de faire semblant.

Le trait entre deux étapes distingue deux situations :

| Trait | Ce que ça veut dire |
| --- | --- |
| plein | l'étape nomme elle-même la suivante dans son fichier |
| pointillé | l'ordre vient du tableau, rien ne le confirme dans l'étape |

Sur cette machine, `halo` confirme ses dix transitions, `lancer` aucune de ses
six. Les positions sont calculées, jamais simulées : un plan qui bouge d'un
rafraîchissement à l'autre est illisible. Un agent appelé par trois étapes
apparaît une fois, avec trois liens.

Le croisement tableau ↔ disque donne deux écarts de plus :

| Écart | Conséquence |
| --- | --- |
| Étape déclarée, fichier absent | l'étape ne s'exécutera jamais |
| Fichier présent, absent du tableau | il ne sera jamais lu |

**Au survol**, le plan éclaire le voisinage et estompe le reste. Survoler une
étape montre ce qu'elle appelle ; survoler un sous-agent montre les étapes qui
l'appellent — le « utilisé par », que la lecture des fichiers ne donne pas d'un
coup d'œil. Le focus clavier déclenche la même chose : un plan qui ne se lit
qu'à la souris ne se lit pas.

Les arrêts durs se lisent à trois endroits, parce que les compétences ne les
déclarent pas toutes pareil : la cellule du tableau, les titres du fichier
d'étape, et une section « arrêts durs » du `SKILL.md` qui énumère les numéros.
Une mention en passant dans un corps ne compte pas — `halo/step-01` contient
« arrêt dur » uniquement pour dire qu'il n'en a **pas**, et le compter en
faisait deux là où `step-02` se déclare « le seul arrêt dur de HALO ».

### Comment un workflow est reconnu

Une ligne de tableau dont **la première cellule est un nombre** et dont **une
cellule cite un fichier `.md`**. Le rôle est la cellule suivante.

Les trois façons d'écrire le chemin sont acceptées — accents graves
`` `steps/step-00.md` ``, lien Markdown `[texte](steps/step-00.md)`, ou chemin
nu — et le tableau peut avoir trois colonnes ou davantage. La première version
n'acceptait que la forme de `halo` et de `lancer` (trois colonnes, accents
graves) : `giva-flow`, qui en a quatre et cite ses étapes en liens, n'était pas
reconnu du tout.

Un arrêt dur se lit à trois endroits : la ligne du tableau, un titre du fichier
d'étape, ou une section « arrêts durs » du `SKILL.md` qui énumère les numéros.
**Une mention qui nie un arrêt n'en déclare pas un** — `halo/step-01` écrit
« Cet arrêt ne remplace pas l'arrêt dur du plan », `giva-flow/step-04` titre
« point d'information, pas arrêt dur ». Sans cette garde, giva-flow affichait
trois arrêts là où sa propre description en annonce deux.

## Ce que ça modifie

**Les compétences** : description, indice d'argument, corps.

**Les commandes**, depuis la page Agents et l'écran d'une commande :

| Geste | Ce qui est écrit |
| --- | --- |
| Créer une commande | `commands/<nom>.md`, portée utilisateur ou projet |
| Modifier le corps | ce qui suit le frontmatter, jamais l'en-tête |
| Retirer une commande | le fichier quitte `commands/` pour `retirees/` — **rien n'est effacé** |

Une commande sans description est refusée : c'est elle qui la présente dans
`/help`, dans la liste que Claude Code déroule à la frappe, et au modèle s'il
l'appelle lui-même. Le `retirees/` est **voisin** de `commands/`, jamais
dessous : Claude Code lit les sous-dossiers comme des espaces de noms, et une
commande retirée y resterait chargée sous `/retirees:<nom>`.

**Les workflows**, depuis la page de plan, trois gestes :

| Geste | Ce qui est écrit |
| --- | --- |
| Ajouter une étape | le fichier d'étape **et** sa ligne dans le tableau — les deux, ou rien |
| Retirer une étape | la ligne quitte le tableau, le fichier part dans `retirees/` — **en deux temps** |
| Renuméroter la séquence | les fichiers, le tableau, les titres et **tous les renvois** |
| Brancher un sous-agent | une puce dans la section `## Sous-agents` de l'étape |
| Débrancher un sous-agent | la puce est retirée, et la section avec elle si elle se vide |
| Créer un sous-agent | `agents/<nom>.md`, portée utilisateur ou projet |

**Deux étapes du même titre sont refusées**, quel que soit leur numéro. Le
double clic ne fabriquait pas un fichier identique mais deux fichiers dont les
noms ne diffèrent que d'un chiffre — `etape-01-relecture.md` puis
`etape-02-relecture.md` — parce que la seconde soumission relit le disque et
vise le numéro suivant. Le refus vit côté serveur : un bouton grisé n'y aurait
rien fait, un onglet rouvert ou un renvoi après délai d'attente ramenant le
doublon. Les formulaires de création se vident après un succès, pour que la
saisie ne reste pas armée.

L'ajout d'une étape déduit la convention du workflow au lieu d'en imposer une :
`halo` reçoit `steps/step-11-….md`, `lancer` reçoit `etapes/etape-07-….md`. Si
la ligne du tableau ne peut pas être écrite, le fichier créé est retiré — un
fichier sans ligne serait précisément l'orphelin que cet outil sert à
détecter.

Brancher **n'insère jamais de texte au milieu de la prose**. La section
`## Sous-agents` est créée en fin de fichier au besoin, et c'est la seule que
l'outil touche. Un agent déjà nommé ailleurs dans l'étape est déjà branché :
l'outil le dit et n'écrit rien. Symétriquement, débrancher un agent nommé en
pleine phrase — « délègue à `test-builder` », comme l'écrit `halo` — est
**refusé** : le retirer voudrait dire réécrire une phrase, et ce n'est pas à un
outil de le faire.

**Renuméroter** referme les trous laissés par un retrait : 00, 01, 03, 04
redevient 00, 01, 02, 03. C'est la transformation la plus large de l'outil, et
la seule qui **se montre avant de s'écrire** — l'aperçu liste chaque renommage
et chaque ligne réécrite, avec son avant et son après, et n'écrit rien.

Elle touche quatre choses à la fois : le nom des fichiers, le numéro **et** le
chemin dans le tableau, le titre `# Étape NN` de chaque fichier, et les renvois
que les étapes se font entre elles — `halo` en compte des dizaines, sous trois
formes (`steps/step-04-verify.md`, `step-04`, « étape 04 »).

Deux pièges, tous deux traités : une substitution séquentielle 04→03 puis 03→02
écraserait la première, donc tous les anciens jetons sont reconnus par **une
seule expression** et remplacés d'un coup ; et renommer 04 en 03 écraserait le
fichier 03 s'il n'avait pas encore bougé, donc les renommages passent par un
nom provisoire.

Les cinq gestes vivent dans une barre d'icônes sous le plan, chacun ouvrant
une modale. Ils étaient auparavant cinq formulaires empilés qui prenaient plus
de place que le plan qu'ils servent à modifier et poussaient les étapes hors de
l'écran. Les modales sont des `<dialog>` natifs : le piège de focus,
l'échappement et l'inertie du reste de la page viennent avec, sans dépendance.

**Les deux gestes qui enlèvent le plus se confirment en deux temps** : retirer
une étape, et renuméroter. Le premier clic ne fait que montrer — pour un
retrait, la ligne exacte du tableau qui disparaîtra, le fichier visé et sa
destination, **en chemins absolus**. Le second écrit.

Entre les deux, un jeton lie ce qui a été montré à ce qui sera écrit :
l'empreinte des fichiers concernés (taille et date) pour le retrait, celle du
plan complet pour la renumérotation. Si une session a touché aux fichiers
entre-temps, l'écriture est refusée — « Les fichiers ont changé depuis
l'aperçu ». Sans ce jeton, les deux clics relisaient le disque séparément et la
promesse « ça se montre avant de s'écrire » était invérifiable.

Ce n'est pas un verrou : deux écritures simultanées restent possibles. C'est la
garantie de ne jamais écrire sur un état qu'on n'a pas montré, ce qui est la
seule chose promise.

Retirer une étape **n'efface rien**. La ligne quitte le tableau et le fichier
est déplacé dans un dossier `retirees/` voisin — hors du dossier d'étapes, donc
jamais signalé comme orphelin. Un `~/.claude` d'utilisateur n'est pas toujours
sous Git : `halo` ne l'est pas, et un effacement y serait irrécupérable.

Écriture par fichier temporaire puis renommage, pour qu'une session qui lit au
même instant ne voie jamais un fichier à moitié écrit. Trois refus partagés par
toutes les écritures, dans un seul module : hors des racines connues, **dans un
plugin** — clone de dépôt, écrasé au prochain `claude plugin update` — et
écrasement d'un fichier existant lors d'une création.

## La règle qui gouverne tout le code

**Ne jamais re-sérialiser le YAML.** Le frontmatter est réécrit ligne à ligne :
seules les clés modifiées bougent, le reste ressort octet pour octet.

La raison est concrète. `~/.claude/skills/halo/SKILL.md` contient
`argument-hint: [step] <demande en langage naturel>`, que YAML strict refuse —
`[step]` est lu comme une séquence en flot, puis le texte qui suit surprend
l'analyseur. Claude Code, lui, charge ce fichier sans broncher. Une première
version de cet outil déclarait donc `halo` morte, à tort ; un test contrôlé sur
2.1.227 (quatre compétences en configuration isolée) a montré que seul
`disable-model-invocation: true` la retirait de la liste.

**Un outil qui annonce une panne inexistante est pire que pas d'outil.** La
lecture tente YAML strict, retombe sur une lecture ligne à ligne, et ne déclare
illisible que si les deux échouent.

## Le hook de veille

Le même écart de plugins, sans ouvrir l'interface. Un hook `SessionStart`
déclaré dans `~/.claude/settings.json`, **hors de tout plugin** — un plugin mort
ne charge pas ses propres hooks, donc ne peut pas signaler sa mort.

Le bloc exact, avec le chemin de **ta** machine, est affiché en bas de la page
d'accueil — avec la mention de savoir s'il est déjà en place, et l'avertissement
de fusionner plutôt que de remplacer si un autre outil occupe déjà
`SessionStart`.

29 ms par passage, aucune dépendance. Il se tait quand tout va bien. Sa sortie
alimente le contexte de session : en session interactive elle s'affiche en tête,
sous « SessionStart hook ».

Il ne doit **jamais** appeler `claude plugin list` — cette commande repeuple
`installPath` depuis le clone de la marketplace avant d'afficher, et répare donc
ce qu'elle prétend mesurer.

## Tests

```bash
npm test && npm run test:hook
```

Soixante-dix-neuf tests TypeScript, huit Python. Les cas les plus utiles sont des
régressions payées : la ligne de `halo` qui doit ressortir intacte après
modification d'une autre ligne, et le refus d'écrire dans un plugin.

## Structure

| Chemin | Rôle |
| --- | --- |
| `lib/lecture/` | Lire le disque : `fichiers`, `competences`, `documents`, `reglages`, `plugins`, `workflow`, `projets`, `choix`, `veille`, `atelier` |
| `lib/plan.ts` | La mise en plan d'un workflow : positions déterministes |
| `lib/ecriture/` | Écrire sans casser : `garde` (les refus partagés), `empreinte` (le lien montré/écrit), `frontmatter`, `competence`, `etape`, `agent`, `renumerotation` |
| `app/` | L'interface : liste, détail modifiable, plan de workflow |
| `hook.py`, `ecart.py`, `lecture.py`, `message.py` | Le hook de veille, indépendant du web |

## Limites

- **L'état effectif complet n'est pas calculable depuis le disque.** Une couche
  de réglages administrés est délivrée à distance à la connexion, à quoi
  s'ajoutent les arguments CLI, l'environnement et `--settings`. L'outil dit
  « voici un écart certain », jamais « voici tout ».
- **Seules les compétences sont modifiables.** Agents, commandes, hooks et
  permissions sont en lecture seule pour l'instant.
- **La précédence n'est pas calculée.** Quand deux éléments de même nom
  existent dans deux portées, l'un éclipse l'autre en silence. C'est le plus
  gros écart encore non détecté, et le prochain à écrire.


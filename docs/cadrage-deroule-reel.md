# Cadrage — Le déroulé réel des workflows

> Statut : **implémenté le 2026-08-26**, les quatre tranches. Rédigé le même jour à
> partir d'une analyse manuelle menée sur les sessions « Mandat » du projet
> `giva-front/Ai-Giva`. Ce qui a été appris en le construisant est en fin de page.

## 1. L'objectif réel

Orcha montre aujourd'hui le workflow **tel qu'il est écrit** : le tableau d'étapes, les
agents que chaque étape appelle, les arrêts durs, et les écarts de déclaration
(étape déclarée sans fichier, fichier jamais lu). C'est le plan.

Ce qu'il ne montre pas : **ce qui s'est réellement passé quand le workflow a tourné**.
Or cette matière est déjà sur le disque, dans `~/.claude/projects/<projet>/*.jsonl`, et
Orcha l'ouvre déjà — mais seulement pour ses quarante premières lignes, pour y lire le
`cwd` du sélecteur de projet (`lib/lecture/projets.ts`).

La fonctionnalité ajoute la seconde moitié de la paire : **le déroulé**, et l'écart entre
le plan et lui.

C'est la même doctrine que celle des écarts existants, d'un cran plus loin :

| Aujourd'hui | Avec le déroulé |
| --- | --- |
| Déclaré mais **sans effet** (hook vide, plugin absent) | Déclaré mais **jamais emprunté** (étape qu'aucune session ne franchit) |
| — | Déclaré et **coûteux** (arrêt dur qui immobilise 18 minutes) |
| — | **Repris** (la même étape relue trois fois dans une session) |

### Ce que la mesure a déjà trouvé, à la main

Sur une seule matinée (deux sessions, 3 h 03), l'analyse manuelle a sorti trois chiffres
qui ont chacun produit une correction du workflow le jour même :

- **42 minutes intégralement jetées** — chantier git ouvert à la minute 1 sur un ticket
  qui n'était pas démarrable, PR fermée à la minute 41.
- **18,7 minutes d'attente sèche** sur un arrêt dur dont plus aucune question n'était
  ouverte : l'orchestrateur attendait un accusé de réception.
- **15 minutes** passées à construire une proposition d'écriture Notion refusée d'un mot.

Aucun de ces trois chiffres n'est visible dans le plan déclaré. Tous les trois se lisent
dans les transcriptions.

## 2. Le périmètre

### Dedans

- Lecture des transcriptions du **projet choisi** dans l'interface — la résolution de
  racine existante s'applique, sans exception.
- Reconstruction, par session : bornes de temps, étapes franchies, appels d'agents,
  tours de parole humains.
- **Croisement avec le `Workflow` déjà modélisé** (`lib/lecture/workflow.ts`) : c'est le
  cœur, pas un à-côté. Une mesure sans le plan en face n'est qu'une statistique.
- Restitution sur la page workflow existante.

### Dehors, et pourquoi

- **Aucun appel à un modèle.** Orcha « lit ton disque et ne parle à personne » : la
  promesse tient, donc l'analyse est **arithmétique, pas interprétative**. Orcha produit
  les chiffres et l'enchaînement ; l'interprétation reste à l'humain — ou à Claude Code,
  à qui on montre la page. C'est la contrainte la plus structurante du sujet, et elle
  n'est pas négociable sans changer la nature de l'outil.
- **Aucun affichage du corps des messages.** Les transcriptions contiennent les prompts
  complets, donc potentiellement des secrets et des données client. On affiche des
  métriques, des noms d'étapes et des noms d'agents — jamais un contenu de conversation.
- Pas d'agrégation multi-projet, pas d'historique persistant, pas de base : le calcul se
  refait à la lecture, comme le reste de l'outil.
- Aucune écriture dans `~/.claude/projects/` — jamais, sous aucune option.

## 3. Ce qu'on extrait d'une transcription

Format non documenté et non stable : le nom de l'outil de sous-agent est `Agent` sur les
sessions récentes et `Task` sur les anciennes. La couche de lecture accepte les deux et
**affiche « format non reconnu » plutôt que de planter ou de compter faux**.

| Signal | Ligne JSONL | Ce qu'il donne |
| --- | --- | --- |
| Titre de session | `type: "custom-title"` → `customTitle` | Le nom lisible, celui que l'humain emploie |
| Bornes et durées | `timestamp` de chaque ligne | Durée de session, durée d'étape, latence |
| Étape franchie | `tool_use` `Bash` dont la commande lit un `cheminAbsolu` d'`EtapeWorkflow` | **La clé de jointure avec le plan** |
| Appel d'agent | `tool_use` `Agent`/`Task` → `subagent_type`, `run_in_background` | Enchaînement des agents, boucles de reprise |
| Tour humain | `message.role: "user"` hors `<system-reminder>` | Attente réelle sur les arrêts durs |

> **Sur la détection d'étape.** Une étape est réputée franchie quand son fichier est lu.
> C'est fiable dans un sens seulement : un orchestrateur qui a déjà l'étape en contexte ne
> la relit pas. L'interface dit donc **« franchie » / « non observée »**, jamais « non
> faite » — affirmer l'absence sur un signal qui ne la prouve pas serait le même défaut
> que compter `disable-model-invocation` comme une panne.

## 4. Les quatre mesures

1. **Couverture du plan** — pour chaque étape déclarée : combien de sessions l'ont
   franchie, combien de fois par session. Une étape jamais observée sur dix sessions est
   morte ; une étape relue trois fois dans la même session est une boucle.
2. **Répartition du temps** — par étape, ce qui part en **temps machine** (un agent
   tourne) et ce qui part en **attente humaine**. C'est la mesure qui rend un workflow
   comparable à lui-même d'une semaine sur l'autre.
3. **Coût des arrêts durs** — pour chaque arrêt dur déclaré (`EtapeWorkflow.arretDur`,
   déjà modélisé), la durée réelle entre la demande et la réponse.
4. **Travail repris** — enchaînements d'agents qui reviennent en arrière
   (`implementer > reviewer > implementer`), et sessions qui s'arrêtent sans atteindre la
   dernière étape.

## 5. Les risques

| Risque | Mesure |
| --- | --- |
| **Volumétrie** — 162 Mo pour 24 sessions d'un seul projet, 17 Mo pour la plus grosse session | Lecture ligne à ligne en flux, jamais le fichier en mémoire ; cache par `mtime`, comme le reste des lectures disque |
| **Format instable** — `Agent` vs `Task`, champs non documentés | Lecture tolérante, écart « format non reconnu » affiché plutôt que compté faux |
| **Faux négatif d'étape** — étape faite sans relecture du fichier | Vocabulaire « non observée », jamais « non faite » |
| **Vie privée** — prompts complets, secrets possibles | Métriques et libellés seulement ; aucun corps de message n'atteint le navigateur |
| **Sur-lecture** — analyser toutes les sessions à chaque affichage | Les N dernières sessions par défaut, le reste à la demande |

## 6. Découpage proposé

Quatre tranches, chacune vérifiable seule, dans l'ordre :

| # | Tranche | Vérifiable par |
| --- | --- | --- |
| 1 | `lib/lecture/deroule.ts` — une transcription → un modèle `Session` typé | Test sur un `.jsonl` de fixture, y compris un fichier au format ancien |
| 2 | Croisement `Session[]` × `Workflow` → couverture du plan | Test : étape déclarée jamais lue → « non observée » |
| 3 | Mesures de temps : machine / attente / arrêts durs | Test sur une fixture aux timestamps connus |
| 4 | Restitution sur la page workflow existante | À l'écran |

## 7. Le point tranché

**Où ça s'affiche : sur la page workflow existante**, en second volet sous le plan, chaque
ligne portant le numéro d'étape du plan. Pas de septième entrée de rail — une page
« Sessions » séparée dirait la même chose en obligeant à faire la jointure de tête, ce que
la fonctionnalité existe précisément pour éviter.

## 8. Ce que la construction a appris

Trois choses que le cadrage n'avait pas vues, toutes payées sur les vraies transcriptions.

**L'horloge ne se mène pas sur n'importe quelle ligne.** Les lignes `attachment` et
`system` portent l'horodatage de leur *capture*, rejoué tel quel des heures plus tard. En
avançant la pendule dessus, l'horloge reculait de seize heures et le bond suivant passait
pour une pause : deux séances sur douze rendaient « 0 minute de durée, 171 minutes
d'attente ». Seuls les tours `assistant` et `user` mènent le temps — et seulement ceux qui
portent le `sessionId` du fichier, car une session reprise emporte l'historique de son
parent.

**Une pause ne se détecte pas sur le seul tour humain.** Une nuit passée pendant qu'une
tâche de fond tourne ne réveille personne : sans garde, ces huit heures comptaient en
« travail machine ». Un trou de plus de trente minutes est une pause, que l'humain reprenne
la parole ou non — et le plafond est nommé, `PAUSE_MAXIMALE`, parce que c'est un réglage,
pas une vérité.

**`Task` n'existe pas ici.** Le cadrage l'annonçait sur les sessions anciennes ; sur les
quinze projets de cette machine, l'outil de sous-agent s'appelle `Agent` partout. Les deux
noms sont acceptés quand même — le coût est d'une ligne, et la couverture vient d'une
fixture, pas du disque.

## 9. Où c'est écrit

| Fichier | Ce qu'il fait |
| --- | --- |
| `lib/lecture/deroule.ts` | Une transcription `.jsonl` → une `Session`, en lecture ligne à ligne |
| `lib/lecture/sessions.ts` | Quelles transcriptions ouvrir, et le cache par `mtime` |
| `lib/lecture/mesures.ts` | `Session[]` × `Workflow` → les quatre mesures |
| `components/DerouleWorkflow.tsx` | Le second volet de la page workflow |
| `components/EtapesMesurees.tsx` | Les étapes classées par coût — exécution par défaut |
| `lib/temps.ts` | Une durée en millisecondes, dite en français |
| `lib/agent/question.ts` | La question qu'une ligne du déroulé pose à l'agent |
| `components/agent/appel.ts` | Le pont entre une page et le panneau de la coquille |

## 10. Le classement des étapes

Ajouté après coup, à l'usage : la question posée à ce volet est « qu'est-ce qui coûte »,
pas « dans quel ordre ». Les étapes se classent donc par **temps d'exécution** par défaut,
par **temps d'attente** au clic, et l'ordre du plan reste à un clic — le schéma ordonné est
déjà juste au-dessus, et chaque ligne porte son numéro d'étape quel que soit le classement.

À coût égal l'ordre du plan tranche, parce que `sort` est stable en JavaScript : deux étapes
non observées restent dans l'ordre où elles sont déclarées. Le tri vit dans l'état du
composant et pas dans l'URL : il se change dix fois en trente secondes pour comparer deux
axes, et un aller-retour serveur par clic sur 162 Mo de transcriptions serait absurde.

## 11. Passer la main à l'agent

Chaque ligne du déroulé porte une icône qui ouvre le panneau d'agent existant avec la
question déjà écrite : le numéro d'étape, son rôle, et **ses chiffres mesurés**. Sans les
chiffres, l'agent ouvre le fichier d'étape et raisonne sur ce qui est *écrit* — exactement
ce que la mesure existe pour dépasser.

**La promesse du §2 tient.** Orcha ne parle toujours à aucun modèle : `question.ts` rédige
une phrase, il n'appelle rien. C'est le panneau d'agent — déjà là, déjà le seul chemin vers
un modèle dans l'application — qui appelle, quand l'utilisateur envoie. L'analyse reste
arithmétique ; seule l'interprétation change de main, et sur décision explicite.

**L'icône n'envoie pas.** Elle ouvre, remplit et pose le curseur au bout. L'agent peut
modifier les fichiers du workflow : un clic qui déclencherait l'appel ferait partir une
écriture que personne n'a relue.

Le contexte d'écran du workflow (`lib/agent/contexte.ts`) emporte désormais le déroulé
complet, la mise en garde de vocabulaire comprise — un agent à qui on donne « 0/10 séances »
sans elle conclut « étape morte, supprime-la », et se trompe sur toute étape que
l'orchestrateur garde en contexte.

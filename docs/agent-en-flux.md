# L'agent, au fil de l'eau

> Statut : **implémenté le 2026-09-02**. Remplace le chemin bufferisé qui rendait
> l'agent inutilisable au quotidien.

## 1. Le reproche

« Le système agentique ne me permet pas de modifier les workflows facilement,
comme le fait Claude Desktop. » Et : « les réponses de l'agent sont difficiles à
comprendre ».

Les deux avaient la même cause. L'agent tournait en `--output-format text` :
tout était mis en mémoire, l'écran affichait « Thinking… » pendant dix secondes
ou six minutes, puis un bloc de quatre lignes tombait. On ne savait ni s'il
travaillait, ni ce qu'il avait ouvert, ni ce qu'il venait de réécrire.

La doctrine aggravait le tout. Elle réclamait « trois lignes au plus » et
interdisait de raconter ce qui avait été vérifié. C'était juste tant que l'écran
n'affichait rien d'autre — un mur de texte dans un panneau de trente rem ne se
lit pas. Mais ce qui manquait à la réponse n'était pas de la longueur : c'était
**ce qui l'avait produite**.

## 2. Le partage

> L'écran montre le geste. La réponse porte le sens.

`--output-format stream-json` rend une ligne JSON par événement. On en tire des
**gestes** — le vocabulaire de l'écran, pas celui du CLI — affichés au fil de
l'eau : ce qui est lu, cherché, lancé, délégué, et **ce qui est réécrit, avec
son avant et son après**.

La réponse finale n'a donc plus à décrire le travail. Elle dit ce que la piste
ne peut pas dire : quels fichiers ont bougé et en quoi, pourquoi ainsi, ce que
ça change à l'usage, et **le geste suivant** — une ligne « Ensuite : ».

## 3. Ce qui ne remonte jamais

| Écarté | Pourquoi |
| --- | --- |
| `tool_result` | Il recopie ce qui a été lu : un `.jsonl` de session, une clé dans un fichier d'environnement. Même règle qu'au §2 du cadrage du déroulé. |
| `thinking` | Dix fois la place de la réponse dans un panneau étroit. |
| Diffs en mémoire longue | Une écriture de gros fichier remplit le quota du navigateur ; le geste est gardé, son contenu part. |

## 4. Le chemin

Une action serveur ne rend qu'une valeur, une fois : c'est ce qui imposait
l'attente muette. Le passage vers le CLI a donc déménagé dans une **route**, qui
peut écrire son corps au fil de l'eau.

| Fichier | Ce qu'il fait |
| --- | --- |
| `lib/claude/flux.ts` | Une ligne du CLI → zéro, un ou plusieurs `Geste`. Fonction pure, testée sur de vraies lignes capturées. |
| `lib/claude/lancement.ts` | `lancerEnFlux` : le même `spawn`, rendu ligne à ligne par `readline`, l'enfant tué si l'abonné se détache. |
| `lib/claude/doctrine.ts` | Les règles du produit et la forme d'une réponse compréhensible. |
| `lib/claude/agent.ts` | La ligne de commande, et `suivreLAgent` qui la déroule. |
| `app/api/agent/route.ts` | L'entrée : contexte, instantané, NDJSON. Mince. |
| `lib/agent/lignes.ts` | Le redécoupage en lignes côté navigateur. |
| `lib/agent/tour.ts` | Ce que les gestes versent dans le fil, et ce qu'ils n'y versent pas deux fois. |
| `components/agent/flux.ts` | `fetch` et lecture du flux. |
| `components/agent/conversation.ts` | L'état de la discussion, sa mémoire, son abandon. |
| `components/agent/Gestes.tsx` | La piste, ses diffs, son repli. |

## 5. Ce que la construction a appris

**La réponse arrivait deux fois.** Le dernier bloc de texte de l'agent EST la
réponse : le CLI le rend au fil de l'eau, puis à nouveau comme résultat. Sans
retrait, elle s'affichait en gris dans la piste puis en clair juste dessous. On
ne coupe que la queue — le récit du début est ce qu'on est venu voir.

**Le code de sortie écrasait la consigne.** Le CLI dit d'abord ce qui cloche
(« Not logged in · Please run /login »), puis s'arrête, et le lanceur traduit le
code 1. Le second message écrasait le premier : l'écran affichait un numéro là
où il y avait une consigne. Le **premier dénouement gagne**.

**Demander est un luxe.** La première version de la règle d'ambiguïté disait :
devant un doute, pose la question et n'écris rien. À l'usage, l'agent s'arrêtait
pour un mot — deux allers-retours là où on attendait un geste, exactement le
reproche de départ. La règle dit maintenant : prends la lecture la plus évidente,
écris, **et dis l'hypothèse**. On ne s'arrête que si l'erreur coûte plus cher
qu'un aller-retour.

**`.shimmer` n'existait pas.** Trois écrans s'en servaient depuis des mois pour
signaler une attente, et la classe n'était définie nulle part : le texte restait
immobile. Une attente qui n'attend pas visiblement ne dit rien.

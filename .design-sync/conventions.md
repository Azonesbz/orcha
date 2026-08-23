# Charte Orcha — comment composer

Orcha montre ce qu'un dossier `.claude` **déclare** et ce qui **charge vraiment**.
Toute la charte découle de là : chaque chose affichée porte sa provenance, et
tout écart porte la règle qui l'a détecté. Les cinq primitives ne sont pas des
briques neutres — elles encodent cette doctrine. S'en écarter produit un écran
qui ressemble à Orcha sans en dire la vérité.

## Le fond sombre est la première règle

La charte pose elle-même `background`, `color` et `font-family` sur `html body`
(`--color-paper: #0a0a0a`, `--color-ink: #fafafa`). Un écran hérite de ce fond :
**ne jamais reposer un composant sur un panneau blanc**, ni ré-imposer une
couleur de fond claire. Les surfaces vont vers le clair par paliers
(`--color-surface`, `--color-surface-muted`), jamais l'inverse.

Identifiants, chemins et comptes en `--font-mono`. Prose en `--font-sans`.
Cette séparation est ce qui rend un inventaire lisible : ce qui est un nom de
fichier se voit comme tel.

## L'emboîtement obligatoire

`Panneau` → `Liste` → `Entree` → (`Pastille` + `Silences`)

- **`Entree` est un `<li>`.** Elle ne s'emploie **jamais** seule : toujours à
  l'intérieur d'un `Liste`, qui est le `<ul>` et porte la carte.
- **`Liste` ne prend que des `Entree`.** Elle n'a ni titre ni compte — c'est le
  rôle du `Panneau` au-dessus.
- **`Panneau` est la section de plus haut niveau** d'une colonne d'inventaire.
  Il porte le titre, le compte, et l'ancre de navigation (dérivée du titre).

## Les props qui portent la doctrine

**`Entree.titre` est un `ReactNode`, pas une chaîne** — c'est la rangée de titre
entière. La composition attendue, dans cet ordre :

```jsx
<Entree
  titre={<>
    <span className="font-mono text-sm">grilling</span>
    <Pastille portee="utilisateur" origine="~/.claude/skill" />
    <span className="font-mono text-xs text-muted">168 lignes</span>
  </>}
  description="Passer au gril un plan ou une décision."
/>
```

**`Pastille` ne s'emploie pas seule.** C'est le marqueur de provenance d'une
rangée de titre. Les quatre portées — `utilisateur`, `projet`, `plugin`,
`intégré` — se distinguent par la bordure et l'encre, pas par une couleur
décorative, et chacune porte son explication en `title`. Une origine longue est
tronquée à 14rem : c'est voulu, pas un défaut à corriger en élargissant.

**`Panneau.vide` n'est pas facultatif en pratique.** Quand `compte === 0`, le
panneau ignore ses enfants et n'affiche que cette phrase. Elle doit dire **ce
qui a été regardé** — « Aucun hook déclaré dans `settings.json`. » — jamais
« Rien ici. » : un vide muet se lit comme une panne de l'outil.

**`Panneau.ecarts` ne s'affiche que s'il est non nul.** `ecarts={0}` ne rend
rien, volontairement : on n'annonce pas l'absence de problème.

**`Silences` rend `null` sur un tableau vide** — on peut toujours le passer sans
garde. Chaque silence est un couple `{cause, detail}` et les deux sont
obligatoires : `cause` est la règle en trois mots, `detail` la phrase qui dit
pourquoi ça ne charge pas.

## L'interdit de fond

**Jamais de verdict sans sa raison.** Un écart affiché sans son `detail`, un
compte alarmant sans la règle qui l'a levé, un badge « cassé » décoratif : c'est
la seule faute que la charte ne pardonne pas. Un outil qui annonce une panne
inexistante est pire que pas d'outil.

De la même façon : ne pas inventer de chiffres pour remplir un écran. Un compte
affiché est un compte mesuré.

## Le rouge est rare

`--color-danger` et `--color-danger-wash` sont réservés aux silences et à la
mention « dont N sans effet ». Ils ne servent ni à un bouton de suppression, ni
à un accent graphique. `--color-amber` existe pour l'avertissement non bloquant.
L'accent (`--color-accent`) est du blanc cassé : l'interface n'a pas de couleur
de marque, et c'est délibéré.

## Les boutons

`btn` est la base, à combiner avec `btn-primary`, `btn-secondary`, `btn-ghost`
ou `btn-danger`. Un écran d'inventaire n'en porte presque jamais : Orcha montre,
il n'agit pas à la place de l'utilisateur.

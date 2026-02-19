# Plan — Items restants

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## GDPR

### MEDIUM

- [ ] Ajouter l'édition de profil (nom, email avec re-vérification) — Art. 16 droit de rectification (`src/routes/_public__root/_default/settings/`)
- [ ] Vérifier et documenter les DPA signés avec chaque sous-traitant (Stripe, Resend, Bunny, Algolia, Mixpanel, Railway) — Art. 28

### LOW

- [ ] Auto-héberger Google Fonts (Bricolage Grotesque) — tribunal de Munich 2022, IP envoyée à Google sans consentement (`src/routes/__root.tsx`)
- [ ] Activer les adresses email de contact (hello@petit-meme.io, legal@petit-meme.io)
- [ ] Ajouter un audit log pour l'export de données utilisateur

---

## Algolia — Stratégie complète

**Plan actuel : Build (gratuit).** Limites : 10K search requests/mois, 1M records, 10K Recommend requests/mois, 10K crawls/mois, 3 rules/index, 30 jours d'analytics.

### Audit de la configuration actuelle

Export de référence : `export-backup-W4S6H0K8DZ-1771521381.json`

#### Comment fonctionne le ranking Algolia (les 8 critères)

Algolia utilise un algorithme **tie-breaking séquentiel**. Les records sont triés par le 1er critère ; en cas d'égalité, le 2e intervient, puis le 3e, etc. Un critère n'est évalué que s'il reste des égalités après les précédents.

| # | Critère | Rôle | Actif pour nous ? |
|---|---------|------|-------------------|
| 1 | **typo** | Moins de fautes = meilleur rang | Oui (toujours) |
| 2 | **geo** | Plus proche géographiquement = meilleur rang | Non (ignoré si pas de geo search — neutre) |
| 3 | **words** | Plus de mots de la requête matchés = meilleur rang | Seulement si `optionalWords` activé (pas le cas) — neutre |
| 4 | **filters** | Plus de filtres matchés = meilleur rang | Seulement avec `optionalFilters` (pas le cas) — neutre |
| 5 | **proximity** | Mots de la requête plus proches dans le record = meilleur rang | Oui (requêtes multi-mots) |
| 6 | **attribute** | Match dans un attribut prioritaire (haut dans `searchableAttributes`) = meilleur rang | Oui — **dépend de la config `searchableAttributes`** |
| 7 | **exact** | Match exact (mot complet, sans typo) > match prefix/typo | Oui (toujours) |
| 8 | **custom** | Critères métier : `viewCount`, `publishedAtTime`, etc. | **Partiellement** — seul `publishedAtTime` est configuré |

Le ranking par défaut `["typo","geo","words","filters","proximity","attribute","exact","custom"]` est optimal — ne pas le modifier.

#### Analyse setting par setting

**`searchableAttributes`** — les champs dans lesquels Algolia cherche, et leur priorité

Config actuelle :
```json
[
  "unordered(title)",
  "unordered(keywords)",
  "unordered(categories.category.title)",      // BUG
  "unordered(categories.category.keywords)",    // BUG
  "unordered(categorySlugs)"                    // INUTILE
]
```

Problèmes identifiés :
1. **`categories.category.title` et `categories.category.keywords`** — ces chemins n'existent pas dans l'index. `memeToAlgoliaRecord()` crée des champs **aplatis** `categoryTitles` et `categoryKeywords`. Les chemins nested ne pointent vers rien → **ces attributs ne sont jamais recherchés** et la recherche par catégorie est cassée.
2. **`description` absent** — si un user cherche un terme présent uniquement dans la description d'un meme, il ne trouvera rien.
3. **`categorySlugs` est searchable** — c'est un champ technique (`culture-pop`, `animaux`...) qui devrait être un filtre, pas un champ de recherche textuelle. Un user ne va pas taper "culture-pop" dans la barre de recherche.

Explications sur `ordered` vs `unordered` :
- **`ordered`** (défaut API) : la position du mot dans l'attribut compte. Un match au début rank mieux qu'un match au milieu. Utile pour des titres où "World War Z" devrait ranker au-dessus de "Avengers: Infinity War" sur la requête "war".
- **`unordered`** : la position du mot ne compte pas. C'est le bon choix pour nos memes car la position d'un mot dans un titre/description de meme n'indique pas la pertinence.
- **La priorité entre attributs** (l'ordre dans le tableau) est exploitée par le critère `attribute` (#6). Un match dans `title` (1er) sera toujours meilleur qu'un match dans `description` (3e), à égalité sur les 5 critères précédents.

Config corrigée :
```json
[
  "unordered(title)",
  "unordered(keywords)",
  "unordered(description)",
  "unordered(categoryTitles)",
  "unordered(categoryKeywords)"
]
```

Choix de l'ordre :
- `title` en 1er : c'est le champ principal, un match dans le titre est le signal le plus fort
- `keywords` en 2e : tags explicitement choisis par l'admin, très pertinents
- `description` en 3e : contenu plus long, potentiellement plus de bruit mais nécessaire pour la couverture
- `categoryTitles` en 4e : un match dans le nom de catégorie est utile mais secondaire
- `categoryKeywords` en 5e : keywords de catégorie, le signal le plus faible

Bonne pratique Algolia : "The more searchable attributes, the noisier the search." On garde 5 attributs, c'est raisonnable. Ne pas ajouter `objectID`, `status`, `imageURL`, `tweetUrl`, etc.

---

**`customRanking`** — critères métier pour départager les résultats à pertinence textuelle égale

Config actuelle :
```json
["desc(publishedAtTime)"]
```

Problème : seul `publishedAtTime` est utilisé. Les memes populaires (beaucoup de vues) n'ont aucun avantage — un meme à 50K vues et un meme à 3 vues sont traités pareil.

Fonctionnement du custom ranking :
- Il intervient **en dernier** dans le tie-breaking (critère #8)
- Les attributs sont évalués dans l'ordre déclaré : le 1er attribut départage, le 2e n'intervient que s'il reste des égalités
- Accepte des numériques et des booléens, avec `asc()` ou `desc()`

Point critique — **le problème de granularité** :
Si `viewCount` a des valeurs très dispersées (3, 47, 152, 8934, 50201...), chaque record a une valeur unique → le 2e attribut (`publishedAtTime`) n'est **jamais** évalué car il n'y a jamais d'égalité sur `viewCount`. Algolia recommande de **réduire la précision** en utilisant un bucketing logarithmique. Exemple : stocker `Math.round(Math.log10(viewCount + 1) * 10)` dans un champ `viewCountRank` au lieu de la valeur brute. Cela regroupe les memes par "tranches" de popularité :
- 0-9 vues → rank 0-10
- 10-99 vues → rank 10-20
- 100-999 vues → rank 20-30
- 1000-9999 vues → rank 30-40

Config corrigée :
```json
["desc(viewCountRank)", "desc(publishedAtTime)"]
```

Ou si on ne veut pas de bucketing (acceptable si le catalogue est petit et qu'on veut vraiment la popularité en premier) :
```json
["desc(viewCount)", "desc(publishedAtTime)"]
```

On mettra `viewCount` (ou `viewCountRank`) en premier car la popularité est le signal business le plus fort pour un site de memes. La fraîcheur (`publishedAtTime`) départage les memes de popularité similaire.

---

**`attributesForFaceting`** — les champs utilisables dans les filtres de recherche

Config actuelle :
```json
["categorySlugs", "publishedAt", "status"]
```

Problèmes :
1. **`publishedAt`** est déclaré mais le code filtre sur **`publishedAtTime`** (timestamp numérique) via `numericAttributesForFiltering`. Incohérence — `publishedAt` en faceting est inutile.
2. **Aucun modificateur `filterOnly()`** — par défaut les attributs sont "Not Searchable" (utilisables comme facets avec comptage). On n'affiche jamais de comptage de facets côté UI, donc `filterOnly()` est recommandé pour réduire la taille de l'index et améliorer les performances.

Les 3 types de faceting :
- **`filterOnly(attr)`** : l'attribut peut être utilisé dans `filters` mais pas comme facet (pas de comptage). **Le plus performant, réduit la taille de l'index.** C'est ce qu'on veut pour nos filtres server-side.
- **`searchable(attr)`** : l'attribut peut être utilisé comme facet ET on peut chercher dans ses valeurs (utile quand un facet a des milliers de valeurs). Overkill pour nous.
- **`attr`** (sans modificateur) : facet standard avec comptage. Utile si on affiche "Culture Pop (42)" à côté du filtre. On ne fait pas ça.

Config corrigée :
```json
["filterOnly(status)", "filterOnly(categorySlugs)"]
```

On retire `publishedAt` car le filtrage numérique sur `publishedAtTime` passe par `numericAttributesForFiltering`, pas par `attributesForFaceting`.

---

**`numericAttributesForFiltering`** — les champs numériques utilisables avec des opérateurs de comparaison (`>=`, `<=`, `=`)

Config actuelle :
```json
["createdAtTime", "publishedAtTime"]
```

C'est correct. Ces champs sont utilisés dans les filtres numériques :
- `publishedAtTime >= ${thirtyDaysAgo}` dans `buildMemeFilters()`
- `createdAtTime` n'est pas utilisé dans le code actuel mais peut l'être

Note : les filtres numériques **n'ont pas besoin** d'être déclarés dans `attributesForFaceting`. C'est un mécanisme séparé.

Si on ajoute le bucketing logarithmique de `viewCount`, ajouter `viewCountRank` ici aussi.

Config corrigée :
```json
["createdAtTime", "publishedAtTime", "viewCount"]
```

---

**`attributesToHighlight`** — les champs dont les termes matchés sont entourés de tags HTML

Config actuelle : `null` (= tous les `searchableAttributes` sont highlightés par défaut)

Quand `null`, Algolia highlight tous les searchable attributes et renvoie un objet `_highlightResult` pour chaque hit. Le problème c'est qu'on ne l'utilise pas côté frontend (le code passe `attributesToHighlight: []` dans `ALGOLIA_SEARCH_PARAMS_BASE` pour le désactiver). Double incohérence : le setting index dit "highlight tout", le code de requête dit "highlight rien".

Fonctionnement :
- Algolia wrape les mots matchés avec `<em>...</em>` (configurable via `highlightPreTag`/`highlightPostTag`)
- Le résultat est dans `hit._highlightResult.title.value` (HTML avec les tags)
- `matchLevel` : `none`, `partial`, ou `full` — permet de savoir si le match est bon
- Limite : Algolia highlight les 50K premiers caractères du result set total

Pour activer le highlighting :
1. Configurer `attributesToHighlight` au niveau de l'index : `["title", "description"]`
2. Retirer l'override `attributesToHighlight: []` dans `ALGOLIA_SEARCH_PARAMS_BASE`
3. Côté frontend, utiliser `_highlightResult.title.value` pour afficher le titre avec le terme surligné
4. Sanitiser le HTML (pour éviter le XSS) : les tags `<em>` d'Algolia sont sûrs, mais vérifier qu'aucune donnée user n'est injectée sans échappement

Config corrigée (index-level) :
```json
["title", "description"]
```

On ne highlight pas `keywords` ni `categoryTitles` car on ne les affiche pas directement dans la liste de résultats.

---

**`attributesToSnippet`** — extraction d'un extrait court autour du terme matché

Config actuelle : `null` (désactivé)

Utile pour les attributs longs (descriptions). Permet d'afficher "...les meilleurs **memes** de la semaine..." au lieu de la description complète. Format : `"description:30"` = 30 mots max autour du match.

Pour notre cas, les descriptions de memes sont courtes (1-2 phrases), donc le snippeting n'est pas prioritaire. On pourra l'activer si les descriptions deviennent plus longues.

Config recommandée : garder `null` pour l'instant.

---

**`exactOnSingleWordQuery`** — comment le critère Exact (#7) s'applique sur les requêtes d'un seul mot

Config actuelle : `"attribute"` (défaut)

Les 3 options :
- **`"attribute"`** : le critère Exact s'applique quand la requête matche **exactement** la valeur entière d'un attribut. Ex: requête "lol" matche exactement le keyword "lol".
- **`"word"`** : le critère Exact s'applique quand la requête matche exactement un mot dans n'importe quel attribut. Plus permissif.
- **`"none"`** : le critère Exact est ignoré pour les requêtes single-word.

Pour un site de memes avec des titres courts et des keywords single-word, `"attribute"` est le bon choix : quand un user tape "neymar", un meme avec le keyword exact "neymar" rankera au-dessus d'un meme qui a "neymar" dans une phrase plus longue.

Config : **garder `"attribute"`** (correct).

---

**`alternativesAsExact`** — quels "alternatives" de mots sont traitées comme des matchs exacts

Config actuelle : `["ignorePlurals", "singleWordSynonym"]` (défaut)

Options :
- **`ignorePlurals`** : "voiture" et "voitures" sont traités comme un match exact (si `ignorePlurals` est activé)
- **`singleWordSynonym`** : un synonyme d'un seul mot (ex: "mdr" → "lol") est traité comme un match exact
- **`multiWordsSynonym`** : un synonyme multi-mots (ex: "NY" → "New York") est traité comme exact

Config : **garder le défaut**. Quand on ajoutera des synonymes (Phase 1.2), `singleWordSynonym` fera que "mdr" et "lol" auront le même poids dans le ranking Exact.

---

**`removeWordsIfNoResults`** — que faire quand une recherche ne retourne aucun résultat

Config actuelle : `"none"` (ne rien faire)

Les options :
- **`"none"`** : 0 résultats → l'user voit une page vide
- **`"lastWords"`** : supprime les derniers mots un par un jusqu'à obtenir des résultats. Ex: "meme chat drôle 2024" → "meme chat drôle" → "meme chat". Recommandé pour les recherches de produits/contenus car l'info principale est au début.
- **`"firstWords"`** : supprime les premiers mots. Utile pour les recherches d'adresses.
- **`"allOptional"`** : tous les mots deviennent optionnels. Renvoie beaucoup de résultats mais perd en pertinence.

Recommandation : passer à **`"lastWords"`**. Pour un site de memes, un user qui tape "meme chat blanc drôle" et obtient 0 résultats est frustré. Avec `lastWords`, il verra au moins les memes "meme chat blanc", puis "meme chat". C'est mieux qu'une page vide.

---

**`paginationLimitedTo`** — nombre max de hits accessibles via pagination

Config actuelle : `1000` (défaut)

Avec `hitsPerPage: 30`, cela donne 33 pages maximum. Au-delà de 1000 résultats, Algolia ne garantit plus l'ordre. Pour un site de memes, 33 pages est largement suffisant (qui va regarder la page 34 ?). De plus, limiter la pagination protège contre le scraping.

Config : **garder `1000`** (correct).

---

**`separatorsToIndex`** — caractères spéciaux à indexer en tant que mots

Config actuelle : `""` (aucun)

Par défaut, Algolia ignore les caractères non-alphanumériques. Si des memes utilisent des hashtags (#), des emojis dans les titres, ou des caractères spéciaux significatifs, on pourrait vouloir indexer `#` pour que "#TeamChat" soit trouvable.

Pour l'instant, nos titres et keywords de memes n'utilisent pas de caractères spéciaux significatifs. Config : **garder vide** (correct).

---

**`attributeForDistinct`** — attribut de dédoublonnage

Config actuelle : `null` (désactivé)

Sert à regrouper les records qui partagent une même valeur (ex: dédoublonner les variantes de produit). Pour un site de memes, chaque meme est unique — pas besoin de dédoublonnage.

Config : **garder `null`** (correct).

---

**`queryType`** — comment les mots de la requête sont matchés

Config actuelle : `"prefixLast"` (défaut)

Options :
- **`"prefixLast"`** : le dernier mot est traité comme un préfixe (typeahead), les autres doivent matcher exactement. "meme cha" → cherche les records avec "meme" exact ET un mot commençant par "cha" (chat, champion...).
- **`"prefixAll"`** : tous les mots sont des préfixes. Plus permissif mais plus de bruit.
- **`"prefixNone"`** : aucun préfixe, tous les mots doivent matcher exactement.

`"prefixLast"` est optimal pour une barre de recherche avec instant-search (l'user tape et voit les résultats en temps réel). C'est exactement notre cas.

Config : **garder `"prefixLast"`** (correct).

---

**Settings manquants à ajouter**

**`queryLanguages` et `indexLanguages`** — configuration linguistique (non configurés)

Actuellement, Algolia utilise le mode "all languages" par défaut, ce qui peut causer des anomalies :
- Le mot français "thé" pourrait être supprimé comme stop-word anglais "the"
- Les pluriels français ne sont pas gérés correctement ("voiture" vs "voitures")

Config recommandée (FR uniquement pour l'instant) :
```json
{
  "queryLanguages": ["fr"],
  "indexLanguages": ["fr"]
}
```

Quand le site sera bilingue FR/EN :
```json
{
  "queryLanguages": ["fr", "en"],
  "indexLanguages": ["fr", "en"]
}
```

**`ignorePlurals`** — traiter singulier et pluriel comme équivalents (non configuré)

Config recommandée : `["fr"]` (activer pour le français). "meme" et "memes" donneront les mêmes résultats. Le critère Exact les traitera comme équivalents grâce à `alternativesAsExact: ["ignorePlurals"]`.

Quand le site sera bilingue : `["fr", "en"]`.

**`removeStopWords`** — supprimer les mots vides ("le", "la", "de", "un"...) (non configuré)

Config recommandée : `["fr"]`. Sans ça, une recherche "le meme du chat" cherche aussi "le" et "du", ce qui ajoute du bruit. Avec `removeStopWords: ["fr"]`, seuls "meme" et "chat" sont cherchés.

Quand le site sera bilingue : `["fr", "en"]`.

---

### Configuration cible complète

```json
{
  "searchableAttributes": [
    "unordered(title)",
    "unordered(keywords)",
    "unordered(description)",
    "unordered(categoryTitles)",
    "unordered(categoryKeywords)"
  ],
  "customRanking": [
    "desc(viewCount)",
    "desc(publishedAtTime)"
  ],
  "attributesForFaceting": [
    "filterOnly(status)",
    "filterOnly(categorySlugs)"
  ],
  "numericAttributesForFiltering": [
    "createdAtTime",
    "publishedAtTime",
    "viewCount"
  ],
  "attributesToHighlight": ["title", "description"],
  "attributesToSnippet": null,
  "attributesToRetrieve": null,
  "ranking": ["typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"],
  "queryType": "prefixLast",
  "removeWordsIfNoResults": "lastWords",
  "exactOnSingleWordQuery": "attribute",
  "alternativesAsExact": ["ignorePlurals", "singleWordSynonym"],
  "queryLanguages": ["fr"],
  "indexLanguages": ["fr"],
  "ignorePlurals": ["fr"],
  "removeStopWords": ["fr"],
  "highlightPreTag": "<em>",
  "highlightPostTag": "</em>",
  "paginationLimitedTo": 1000,
  "separatorsToIndex": "",
  "attributeForDistinct": null,
  "hitsPerPage": 20,
  "maxValuesPerFacet": 100
}
```

---

### Phase 0 — Corrections de bugs et config index (prioritaire)

- [ ] Corriger `searchableAttributes` : remplacer `categories.category.title` → `categoryTitles`, `categories.category.keywords` → `categoryKeywords`, ajouter `description`, retirer `categorySlugs`
- [ ] Ajouter `queryLanguages: ["fr"]`, `indexLanguages: ["fr"]`, `ignorePlurals: ["fr"]`, `removeStopWords: ["fr"]`
- [ ] Passer `removeWordsIfNoResults` de `"none"` à `"lastWords"`
- [ ] Corriger `attributesForFaceting` : ajouter `filterOnly()` sur `status` et `categorySlugs`, retirer `publishedAt`
- [ ] Ajouter `viewCount` à `customRanking` (en premier, devant `publishedAtTime`)
- [ ] Ajouter `viewCount` à `numericAttributesForFiltering`
- [ ] Configurer `attributesToHighlight: ["title", "description"]` au niveau de l'index
- [x] Côté code : retirer `attributesToHighlight: []` de `ALGOLIA_SEARCH_PARAMS_BASE` (`src/lib/algolia.ts`) pour utiliser le setting index
- [x] Slim `memeToAlgoliaRecord` : remplacer `...meme` spread par champs explicites — `AlgoliaMemeRecord` est un superset structurel de `MemeWithVideo` (inclut tous les champs Prisma + champs Algolia)
- [x] Créer `AlgoliaMemeRecord = ReturnType<typeof memeToAlgoliaRecord>` pour typer les résultats de recherche
- [x] Séparer `ALGOLIA_ADMIN_SEARCH_PARAMS` pour l'admin (inclut categoryCount, categorySlugs, etc.)

### Phase 1 — Quick wins (zéro coût, faible effort)

#### 1.1 Activer le highlighting côté frontend

- [ ] Modifier la réponse de `getMemes()` pour propager `_highlightResult` (`src/server/meme.ts`)
- [ ] Modifier le composant d'affichage des memes pour utiliser `_highlightResult.title.value` quand disponible
  - Sanitiser le HTML (les tags `<em>` d'Algolia sont sûrs mais vérifier l'échappement)
  - Rendu : le terme recherché apparaît en `<em>` dans les titres — styler via CSS (`em { background: yellow; }` ou équivalent Tailwind)
  - Afficher le highlight uniquement quand il y a une requête de recherche active

#### 1.2 Synonymes manuels (FR)

- [ ] Ajouter les synonymes français dans le dashboard Algolia
  - `"mdr" <-> "lol" <-> "mort de rire"`
  - `"ptdr" <-> "pété de rire"`
  - `"bg" <-> "beau gosse"`
  - `"tg" <-> "ta gueule"`
  - `"jsp" <-> "je sais pas"`
  - `"sah" <-> "sérieux" <-> "wallah"`
  - Ajouter les noms de personnalités avec variantes d'écriture
  - Impact : les synonymes single-word sont traités comme des matchs exacts grâce à `alternativesAsExact`

#### 1.3 Synonymes anglais (préparation i18n)

- [ ] Ajouter les synonymes anglais quand le site sera bilingue
  - `"lmao" <-> "lol" <-> "rofl"`
  - `"bruh" <-> "bro"`
  - `"fr" <-> "for real"`
  - Mettre à jour `queryLanguages` et `indexLanguages` à `["fr", "en"]`
  - Mettre à jour `ignorePlurals` et `removeStopWords` à `["fr", "en"]`

#### 1.4 Slimmer `memeToAlgoliaRecord`

- [ ] Supprimer le `...meme` spread dans `memeToAlgoliaRecord` (`src/lib/algolia.ts`)
  - Ne stocker que les champs nécessaires : `objectID`, `title`, `description`, `keywords`, `status`, `viewCount`, `tweetUrl`, `createdAt`, `updatedAt`, `publishedAt`, `video.bunnyId`, `video.duration`, `categoryTitles`, `categoryKeywords`, `categorySlugs`, `imageURL`, `createdAtTime`, `publishedAtTime`
  - Supprimer tout le reste (champs Prisma internes, relations complètes)
  - Impact : index plus léger, moins de bande passante

### Phase 2 — Algolia Events & Insights (fondation, effort moyen)

Les events alimentent **3 fonctionnalités** : Analytics dashboard, Recommend, et (futur) click-through rate dans le ranking.

#### 2.1 Installer le client Insights

- [ ] Utiliser `@algolia/client-search` qui expose déjà les méthodes Insights via `pushEvents`
  - Pas besoin d'un package supplémentaire — le SDK v5 (`@algolia/client-search` ^5.49.0) inclut l'API Insights
  - Créer un helper `sendAlgoliaEvent()` dans `src/lib/algolia.ts` qui wrape `algoliaAdminClient.pushEvents()`

#### 2.2 Activer `clickAnalytics` sur les requêtes de recherche

- [ ] Ajouter `clickAnalytics: true` dans les `searchParams` de `getMemes()` (`src/server/meme.ts`)
  - Algolia retournera un `queryID` avec chaque réponse
  - Propager le `queryID` dans la réponse serveur vers le frontend
  - Le `queryID` est nécessaire pour associer un clic à une recherche spécifique
  - Attention : `clickAnalytics: true` **consomme des search requests supplémentaires** dans le compteur — surveiller la consommation

#### 2.3 Envoyer les events de vue (View)

- [ ] Envoyer un event `view` à Algolia Insights depuis `registerMemeView` (`src/server/meme.ts`)
  - L'event existe déjà côté Prisma (incrémentation `viewCount`) — ajouter l'appel Algolia Insights en parallèle
  - Payload : `{ eventType: 'view', eventName: 'Meme Viewed', index, objectIDs: [memeId], userToken }`
  - `userToken` : utiliser le `viewerKey` (cookie anonyme déjà en place via `COOKIE_ANON_ID_KEY`)
  - Wraper dans `safeAlgoliaOp` pour ne pas bloquer l'UX si l'appel Insights échoue

#### 2.4 Envoyer les events de clic (Click)

- [ ] Envoyer un event `clickedObjectIDsAfterSearch` quand un user clique sur un résultat de recherche
  - Données nécessaires : `queryID` (de la recherche), `objectID` (du meme), `position` (dans les résultats, 1-indexed)
  - Déclencher depuis le composant `MemeListItem` lors du clic (passer `queryID` + `position` via les props)
  - Seuls les clics issus d'une recherche doivent envoyer cet event (pas les clics depuis la homepage, catégories, etc.)
  - La position Algolia est **1-indexed** (le 1er résultat = position 1)

#### 2.5 Envoyer les events de conversion (Conversion)

- [ ] Envoyer un event de conversion pour les actions à forte valeur
  - **Bookmark/favori** : `src/hooks/use-toggle-bookmark.ts`
  - **Partage** : `src/hooks/use-share-meme.ts`
  - **Téléchargement** : `src/hooks/use-download-meme.ts`
  - **Ouverture Studio** : `src/components/Meme/player-dialog.tsx`
  - Si l'action vient d'une recherche (présence de `queryID`), envoyer `convertedObjectIDsAfterSearch`
  - Sinon, envoyer un `convertedObjectIDs` simple (conversion non liée à une recherche)
  - Pour Recommend, il faut au minimum ~1000 events de conversion sur 2+ items par 10+ users

#### 2.6 GDPR & userToken

- [ ] Le `userToken` pour Algolia Insights doit respecter le consentement cookies
  - Si consentement accepté : utiliser le `viewerKey` (cookie `COOKIE_ANON_ID_KEY` déjà en place)
  - Si consentement refusé : ne pas envoyer d'events Insights
  - Pour les users authentifiés : utiliser un hash de l'`userId` comme `authenticatedUserToken`
  - Documenter dans la politique de confidentialité que les données de recherche sont partagées avec Algolia

### Phase 3 — Analytics Dashboard (gratuit, dépend de Phase 2)

Une fois les events en place, le dashboard Algolia Analytics devient exploitable.

#### 3.1 Configurer le dashboard Analytics

- [ ] Vérifier que l'Analytics est activé dans les paramètres de l'index Algolia
  - Le plan Build offre 30 jours de rétention
  - Métriques disponibles : top recherches, recherches sans résultats, click-through rate, click position, taux de conversion
  - Aucun code à écrire — tout est dans le dashboard Algolia

#### 3.2 Boucle d'amélioration continue

- [ ] Consulter le dashboard régulièrement pour :
  - **Recherches sans résultats** → ajouter des synonymes ou du contenu manquant
  - **Recherches populaires** → créer des catégories dédiées ou épingler du contenu (Rules)
  - **Click position** → si les users cliquent loin dans la liste, le ranking doit être ajusté
  - **Taux de conversion** → identifier les memes qui convertissent le mieux
  - **Recherches avec typos** → vérifier que `minWordSizefor1Typo: 4` et `minWordSizefor2Typos: 8` sont adaptés au contenu FR

### Phase 4 — Algolia Recommend (gratuit, dépend de Phase 2)

10K requêtes Recommend/mois incluses. Nécessite ~1000 events de conversion sur 2+ items par 10+ users pour fonctionner.

#### 4.1 Activer le modèle "Related Items"

- [ ] Dans le dashboard Algolia → Recommend → activer "Related Items" sur l'index memes
  - Algolia entraîne le modèle ML automatiquement à partir des events (vues, clics, conversions)
  - Re-entraînement quotidien automatique
  - Prérequis : avoir accumulé suffisamment d'events (Phase 2 doit être active depuis quelques semaines)

#### 4.2 Activer le modèle "Trending Items"

- [ ] Activer "Trending Items" — les memes qui gagnent en popularité récemment
  - Basé sur les events de vue et de clic
  - Utilisable pour une section "Trending" sur la homepage
  - Alternative/complément au `getBestMemes()` actuel qui ne regarde que `viewCount` (alltime)

#### 4.3 Intégrer Recommend côté serveur

- [ ] Installer `@algolia/recommend` (`npm install @algolia/recommend`)
- [ ] Créer une server function `getRelatedMemes(memeId)` qui appelle l'API Recommend
  - `model: 'related-products'`, `objectID: memeId`, `maxRecommendations: 6`
  - Mettre en cache avec `withAlgoliaCache` (TTL 10 min, clé `recommend:${memeId}`)
  - Chaque `objectID` dans la requête consomme 1 Recommend request (6 objectIDs = 6 requests)
- [ ] Créer une server function `getTrendingMemes()` qui appelle l'API Recommend
  - `model: 'trending-items'`, `maxRecommendations: 12`
  - Mettre en cache avec `withAlgoliaCache` (TTL 10 min, clé `trending`)

#### 4.4 Intégrer Recommend côté frontend

- [ ] Afficher "Memes similaires" sur la page meme (`src/routes/_public__root/_default/memes/$memeId.tsx`)
  - Section en dessous du player : grille de 6 memes recommandés par Algolia
  - Fallback si pas assez de données : utiliser `getRandomMeme()` existant
- [ ] Afficher "Trending" sur la homepage
  - Section "En ce moment" avec les memes trending
  - Remplacer ou compléter le `getBestMemes()` actuel (qui est un simple ORDER BY viewCount)

### Phase 5 — Rules (3 gratuites par index)

#### 5.1 Rule de pinning contextuel

- [ ] Réserver 1-2 rules pour du pinning contextuel (épingler un meme spécifique en top pour un terme de recherche)
  - Exemple : recherche "squid game" → épingler le meme phare Squid Game en position 1
  - Configuration dans le dashboard, modifiable sans déploiement
  - Les Rules sont évaluées **avant** le ranking — elles overrident le tri naturel

#### 5.2 Rule de bannière

- [ ] Utiliser 1 rule pour afficher un `userData` contextuel (bannière/message)
  - Exemple : recherche "nouveau" → renvoyer un `userData: { banner: "Découvre les derniers memes !" }`
  - Le frontend lit `response.userData` et affiche le message au-dessus des résultats

### Phase 6 — Préparation i18n (FR/EN)

#### 6.1 Stratégie d'index bilingue

- [ ] Décider de l'approche pour le bilinguisme :
  - **Option A — Index unique avec champ `lang`** : un seul index, chaque record a un champ `lang: 'fr' | 'en'`, filtré par langue côté recherche. Plus simple, utilise 1 seule quota de records.
  - **Option B — Deux index séparés** (`memes_fr`, `memes_en`) : isolation complète, synonymes et rules par langue, `queryLanguages` ciblé par index. Plus propre mais double la consommation de records et rules (3 par index).
  - **Recommandation : Option B** si le plan Grow est actif (synonymes et rules séparés par langue). **Option A** si on reste en plan Build (1M records partagés, 3 rules pour tout).

#### 6.2 Champs multilingues

- [ ] Ajouter les champs `title_en`, `description_en`, `keywords_en` dans l'index Algolia
  - Searchable attributes configurés par langue
  - Synonymes FR et EN séparés (déjà préparés en Phase 1.2 et 1.3)
  - Le filtre `lang` est ajouté automatiquement côté serveur selon la langue de l'utilisateur
  - Mettre à jour `queryLanguages`, `indexLanguages`, `ignorePlurals`, `removeStopWords` à `["fr", "en"]`

### Phase 7 — Virtual Replicas (gratuit)

Les virtual replicas permettent un tri alternatif sans dupliquer les records (0 coût de records supplémentaires). Chaque replica partage la config de l'index primaire (searchableAttributes, faceting, etc.) mais a son propre `ranking`/`customRanking`.

#### 7.1 Replica "tri par popularité"

- [ ] Créer une virtual replica `memes_popular` avec `customRanking: ["desc(viewCount)"]`
  - Utilisable pour une vue "Les plus populaires" avec un tri strict par vues (pas de relevance textuelle qui interfère)
  - Les virtual replicas consomment des search requests sur le même quota

#### 7.2 Replica "tri par date"

- [ ] Créer une virtual replica `memes_recent` avec `customRanking: ["desc(publishedAtTime)"]`
  - Utilisable pour la catégorie "Nouveautés" — remplace le filtre actuel sur `publishedAtTime >= 30 jours`
  - Tri strict chronologique inverse

---

### Grille de coûts — Quand passer au plan payant ?

Le plan Build (gratuit) a des limites strictes. Voici les seuils à surveiller :

#### Search Requests (10K/mois gratuit)

| Scénario | Requêtes estimées/mois | Dans le gratuit ? |
|----------|----------------------|-------------------|
| ~50 users/jour, cache actif (TTL 5 min) | ~2K-4K | Oui |
| ~200 users/jour, cache actif | ~8K-12K | Limite |
| ~500 users/jour | ~20K-30K | Non — plan Grow nécessaire |
| ~1000+ users/jour | ~50K+ | Non — plan Grow ou Premium |

Le cache in-memory réduit drastiquement les requêtes (ratio ~5:1 à 10:1). Tant que le cache est actif et que le TTL est raisonnable (5 min), le plan gratuit tient jusqu'à ~150-200 users/jour.

**Plan Grow** : $0.50 / 1K search requests (au-delà du free tier). Pour 50K req/mois : ~$20/mois.

**Note** : `clickAnalytics: true` (Phase 2) peut augmenter la consommation. Virtual replicas consomment aussi du quota search.

#### Recommend Requests (10K/mois gratuit)

| Scénario | Requêtes estimées/mois | Dans le gratuit ? |
|----------|----------------------|-------------------|
| "Related memes" sur page meme, ~100 vues/jour, cache 10 min | ~1K-3K | Oui |
| ~500 vues/jour de pages meme | ~5K-10K | Limite |
| ~1000+ vues/jour | ~15K+ | Non |

**Plan Grow** : $0.60 / 1K Recommend requests. Pour 30K req/mois : ~$12/mois.

Attention : chaque `objectID` passé dans une requête Recommend consomme 1 request. Un appel avec `[A, B, C]` = 3 requests.

#### Records (1M gratuit)

Pour un site de memes, 1M records est largement suffisant. Même avec 10K memes, on est à 1% de la limite. Les virtual replicas ne consomment pas de records supplémentaires. Ce n'est pas un seuil critique.

#### Analytics (30 jours de rétention gratuit)

30 jours suffisent pour le suivi opérationnel. Si on veut des tendances long-terme, il faut exporter les données manuellement (API Analytics → CSV/DB). Le plan Grow offre 90 jours, le Premium 365 jours.

#### Projection de coûts Grow (premier palier payant)

| Composant | Volume | Coût mensuel |
|-----------|--------|-------------|
| Search requests (50K) | 40K au-delà du free | ~$20 |
| Recommend requests (30K) | 20K au-delà du free | ~$12 |
| Records | < 1M (gratuit) | $0 |
| Analytics (90 jours) | Inclus Grow | $0 |
| NeuralSearch | Optionnel (Grow+) | +$0.04/requête |
| **Total estimé** | | **~$32/mois** |

**Seuil de décision : quand le cache ne suffit plus (~200+ DAU réguliers), passer au Grow.**

#### Ce qui est exclu du gratuit et qu'on ne recommande PAS (pour l'instant)

| Feature | Plan requis | Pourquoi pas maintenant |
|---------|------------|------------------------|
| NeuralSearch (semantic) | Grow+ | Overkill pour des memes, le keyword search + synonymes suffit |
| AI Synonyms | Grow+ | Les synonymes manuels FR sont plus fiables pour le slang |
| AI Dynamic Re-ranking | Premium | Nécessite beaucoup de données de conversion |
| Query Suggestions | Business | Autocomplétion server-side, coûteuse — un debounce client suffit |
| Personalization | Premium | Nécessite un volume massif d'events utilisateur |
| Merchandising Studio | Premium | Interface visuelle de rules — les 3 rules gratuites suffisent |

---

### Résumé par priorité d'implémentation

| Phase | Effort | Impact | Dépendances |
|-------|--------|--------|-------------|
| 0 — Corrections config | Faible | Critique (bugs) | Aucune |
| 1 — Quick wins | Faible | Moyen-élevé | Phase 0 |
| 2 — Events & Insights | Moyen | Élevé (fondation) | Phase 0 |
| 3 — Analytics Dashboard | Nul (config) | Moyen | Phase 2 |
| 4 — Recommend | Moyen-élevé | Élevé (engagement) | Phase 2 (quelques semaines d'events) |
| 5 — Rules | Faible | Faible-moyen | Aucune |
| 6 — i18n Algolia | Moyen | Élevé (futur) | Migration i18n du site |
| 7 — Virtual Replicas | Faible | Moyen | Aucune |

---

## Futur

Items non planifiés, à traiter après les corrections ci-dessus.

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.).

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

### Migration npm → pnpm

Remplacer npm par pnpm. Supprimer `package-lock.json`, générer `pnpm-lock.yaml`, mettre à jour les scripts CI/Railway et le `packageManager` dans `package.json`.

### Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : redirection www → apex (et supprimer le check manuel dans `server.ts`), CDN/cache, SSL, protection DDoS, Page Rules, etc. Activer les bonnes fonctionnalités selon les besoins du produit.

### Dependabot — Vulnérabilités

Traiter les 5 vulnérabilités signalées par GitHub (1 high, 4 moderate) : https://github.com/viclafouch/petit-meme/security/dependabot

# Audit — Code dupliqué

| Type | High | Medium | Low |
|------|------|--------|-----|
| Constantes | 0 | 3 | 2 |
| Helpers / Business logic | 2 | 3 | 3 |
| Patterns JSX | 1 | 3 | 1 |
| Types | 0 | 0 | 1 |

---

## HIGH — Duplications les plus impactantes

### 2.1 Mutation optimistic toggle bookmark — dupliquée verbatim

**Fichiers :**
- `src/components/Meme/meme-list-item.tsx:52-99` (`FavoriteItem`)
- `src/components/Meme/toggle-like-button.tsx:20-68` (`AuthBookmarkButton`)

Les deux composants implémentent la même logique optimistic update :
1. `useMemo` sur `getFavoritesMemesQueryOpts` pour calculer `isMemeBookmarked`
2. Mutation `toggleBookmarkByMemeId`
3. `onMutate` : cancel queries, update optimiste du cache
4. `onSettled` : invalidate `getMemeByIdQueryOpts` et `getFavoritesMemesQueryOpts`

Code quasi ligne-pour-ligne identique (~50 lignes dupliquées).

**Fix :** Extraire un hook `useToggleBookmark(meme)` dans `src/hooks/use-toggle-bookmark.ts` retournant `{ isMemeBookmarked, toggleFavorite }`.

---

### 2.3 Gestion de keywords — logique identique dans deux formulaires

**Fichiers :**
- `src/routes/admin/library/-components/meme-form.tsx:112-154`
- `src/routes/admin/categories/-components/category-form.tsx:104-132`

Les deux forms implémentent :
- `useState` pour `keywordValue`
- `handleAddKeyword` : split par virgule, trim, lowercase, filtre vides, déduplique, update du champ form
- `handleRemoveKeyword` : filtre par index

Seule différence : `meme-form` utilise `removeDuplicates()`, `category-form` utilise `[...new Set()]` inline.

**Fix :** Extraire un hook `useKeywordsField(form, fieldName)` dans `src/hooks/use-keywords-field.ts`.

---

### 3.1 JSX keyword input + badge list — pattern identique

**Fichiers :**
- `src/routes/admin/library/-components/meme-form.tsx:235-290`
- `src/routes/admin/categories/-components/category-form.tsx:198-253`

Le JSX est caractère-pour-caractère identique : `FormItem` > `FormLabel` "Mots clés" > `Input` avec `enterKeyHint="done"` > `div.flex.flex-wrap.gap-2` avec `Badge variant="secondary"` + bouton `X` pour chaque keyword.

**Fix :** Créer un composant `KeywordsField` dans `src/components/admin/keywords-field.tsx`.

---

### 4.1 Pipeline de création de meme — dupliqué dans admin.ts

**Fichiers :**
- `src/server/admin.ts:169-229` (`createMemeFromTwitterUrl`)
- `src/server/admin.ts:235-287` (`createMemeFromFile`)

Les deux handlers suivent le même pipeline :
1. `title = 'Sans titre'`
2. Conversion video en buffer (`arrayBuffer()` → `Buffer.from()`)
3. `createVideo(title)` → `videoId`
4. `prismaClient.meme.create()` avec structure de données identique (dont `bunnyStatus` dev override)
5. `algoliaClient.saveObject()` avec `.catch(console.error)`
6. `uploadVideo(videoId, buffer)`
7. Return `{ id: meme.id }`

Seule différence : `tweetUrl: tweet.url` dans la version Twitter.

**Fix :** Extraire une fonction `createMemeWithVideo({ title, tweetUrl?, buffer })` server-only.

---

## MEDIUM

### 1.2 `PRODUCT_ID` — même valeur dans deux fichiers

**Fichiers :**
- `src/constants/polar.ts:1` → `export const PRODUCT_ID = 'f9395cde-...'`
- `src/constants/plan.ts:43` → `productId: 'f9395cde-...'` (dans `PREMIUM_PLAN`)

**Fix :** `PREMIUM_PLAN.productId` devrait référencer `PRODUCT_ID` de `polar.ts`, ou consolider en un seul fichier.

---

### 1.3 `'Sans titre'` — magic string répété

**Emplacements :**
- `src/server/admin.ts:186`
- `src/server/admin.ts:245`
- `src/components/admin/meme-list-item.tsx:87`

**Fix :** Définir `DEFAULT_MEME_TITLE = 'Sans titre'` dans `src/constants/meme.ts`.

---

### 1.4 `'news'` — magic string dans 6 emplacements

**Fichiers :**
- `src/server/meme.ts:74`
- `src/routes/_public__root/-components/hero.tsx:53`
- `src/routes/admin/library/-components/meme-form.tsx:52, 343`
- `src/lib/queries.ts:94, 98`

**Fix :** Définir `NEWS_CATEGORY_SLUG = 'news'` dans `src/constants/meme.ts`.

---

### 2.2 `useDownloadMeme` / `useShareMeme` — hooks quasi identiques

**Fichiers :**
- `src/hooks/use-download-meme.ts`
- `src/hooks/use-share-meme.ts`

Même pattern : fetch blob via `shareMeme`, toast loading, puis `downloadBlob()` ou `shareBlob()`. Seule différence : la fonction d'action finale et le message d'erreur.

**Fix :** Extraire le fetch blob partagé dans un helper ou un hook unique `useMemeAction` paramétré.

---

### 3.2 Footer de formulaire cancel/submit — pattern répété 4 fois

**Fichiers :**
- `src/routes/admin/library/-components/meme-form.tsx:389-410`
- `src/routes/admin/categories/-components/category-form.tsx:255-275`
- `src/components/Meme/MemeForm/file-form.tsx:144-164`
- `src/components/Meme/MemeForm/twitter-form.tsx:139-159`

Tous utilisent `form.Subscribe` avec `[state.canSubmit, state.isSubmitting]` → bouton "Annuler" (outline) + bouton submit (default/loading).

**Fix :** Extraire un composant `FormFooter` qui wrappe le pattern `form.Subscribe`.

---

### 3.3 Thumbnail vidéo avec preview hover — pattern dupliqué

**Fichiers :**
- `src/components/Meme/meme-list-item.tsx:160-198`
- `src/components/admin/meme-list-item.tsx:40-78`

Même structure : image statique (`buildVideoImageUrl`) + image preview au hover (`buildVideoPreviewUrl`) + badge durée.

**Fix :** Extraire un composant `MemeVideoThumbnail` avec un slot `overlay`.

---

### 3.5 Champ texte TanStack Form — boilerplate répété 6+ fois

**Fichiers :** `meme-form.tsx`, `category-form.tsx`, `twitter-form.tsx`

Le pattern `form.Field` → `getFieldErrorMessage` → `FormItem` → `FormLabel` → `FormControl` → `Input` avec `value`, `onBlur`, `onChange` identiques.

**Fix :** Créer un composant `TextField` réutilisable.

---

### 4.2 Algolia `.catch(console.error)` — pattern répété 5 fois

**Fichiers :**
- `src/server/admin.ts` (lignes 119, 154, 214, 274)
- `src/routes/api/bunny.ts:52`

**Fix :** Créer un wrapper `safeAlgoliaOp(promise)` dans `src/lib/algolia.ts`.

---

### 4.3 Algolia search + response shaping — dupliqué

**Fichiers :**
- `src/server/meme.ts:63-97` (`getMemes`)
- `src/server/admin.ts:289-319` (`getAdminMemes`)

Même pattern : `searchSingleIndex`, `page - 1`, `hitsPerPage: 30`, build filters, return `{ memes, query, page, totalPages }`.

**Fix :** Extraire `searchMemesFromAlgolia({ query, page, filters })` dans `src/lib/algolia.ts`.

---

### 4.4 Prisma include pattern — répété 5 fois

**Fichiers :**
- `src/server/meme.ts:22-27`
- `src/server/admin.ts:111-116, 206-210, 264-268`
- `src/routes/api/bunny.ts:37-48`

L'objet `{ video: true, categories: { include: { category: true } } }` est écrit 5 fois.

**Fix :**
```ts
// src/constants/meme.ts
export const MEME_FULL_INCLUDE = {
  video: true,
  categories: { include: { category: true } }
} as const satisfies Prisma.MemeInclude
```

---

## LOW

### 1.1 `THIRTY_DAYS_AGO` — calculé deux fois dans le même fichier

**Fichier :** `src/server/meme.ts:61, 102`

`Date.now() - 30 * 24 * 60 * 60 * 1000` dans `getMemes` et `getRecentCountMemes`.

**Fix :** Extraire en fonction `getThirtyDaysAgoMs()`.

---

### 1.5 Dev bunny status override — dupliqué dans admin.ts

**Fichier :** `src/server/admin.ts:201, 259`

`bunnyStatus: process.env.NODE_ENV !== 'production' ? 4 : undefined` — même ternaire deux fois avec magic number `4`.

**Fix :** Extraire `DEV_BUNNY_STATUS` utilisant `BUNNY_STATUS.RESOLUTION_FINISHED`.

---

### 2.4 `buildUrl` réimplémenté inline dans `seo()`

**Fichier :** `src/lib/seo.ts:32-40, 61-65`

La fonction `buildUrl` existe déjà mais `seo()` réimplémente la même logique inline 5 lignes plus bas.

**Fix :** Appeler `buildUrl(pathname)`.

---

### 2.5 `monthlyPriceInCents / 100` au lieu de `convertCentsToEuros`

**Fichier :** `src/lib/seo.ts:312, 317, 325, 331`

`plan.monthlyPriceInCents / 100` apparaît 4 fois alors que `convertCentsToEuros` existe dans `src/helpers/number.ts`.

**Fix :** Importer `convertCentsToEuros`.

---

### 2.6 Inline `[...new Set()]` au lieu de `removeDuplicates`

**Fichier :** `src/routes/admin/categories/-components/category-form.tsx:107-118`

`[...new Set([...prevState, ...parsed])]` alors que `removeDuplicates` existe dans `@/utils/array` (et est correctement utilisé dans `meme-form.tsx`).

---

### 3.4 Affichage view count avec pluralisation — répété 3 fois

**Fichiers :**
- `src/components/Meme/meme-list-item.tsx:211`
- `src/components/admin/meme-list-item.tsx:96`
- `src/routes/admin/library/$memeId.tsx:59`

`{meme.viewCount} vue{meme.viewCount > 1 ? 's' : ''}` à chaque fois.

**Fix :** Créer `formatViewCount(count)` dans `src/helpers/format.ts`.

---

### 5.1 `MemeListItemProps` — collision de nom de type

**Fichiers :**
- `src/components/Meme/meme-list-item.tsx:31-37`
- `src/components/admin/meme-list-item.tsx:17-19`

Deux types exportés avec le même nom mais des shapes différentes → confusion possible à l'auto-import.

**Fix :** Renommer la version admin en `AdminMemeListItemProps`.

---

## Top 4 consolidations à plus fort impact

1. **Hook `useToggleBookmark`** (2.1) — élimine ~50 lignes de logique optimistic update dupliquée
2. **Hook + composant keywords** (2.3, 3.1) — élimine ~70 lignes de state + JSX dupliqués
3. **Fonction `createMemeWithVideo`** (4.1) — élimine ~40 lignes d'orchestration Prisma + Algolia + Bunny
4. **Constante `MEME_FULL_INCLUDE`** (4.4) — un one-liner qui élimine 5 répétitions du même include Prisma

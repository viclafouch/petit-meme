# Audit — Backend Performance

Score global : **5.5 / 10**

| Sévérité | Nombre |
|----------|--------|
| CRITICAL | 2 |
| HIGH | 6 |
| MEDIUM | 5 |
| LOW | 5 |

---

## CRITICAL

### 1. `getRandomMeme` charge TOUS les memes publiés en mémoire

**Fichier :** `src/server/meme.ts:143-159`

`getRandomMeme` appelle `prismaClient.meme.findMany` **sans limit**, charge tous les memes publiés (+ relation `video`) en mémoire Node.js, filtre en JS, puis en choisit un au hasard. Avec 10 000 memes, chaque appel charge 10 000 lignes + vidéos juste pour en choisir un seul.

Appelé sur chaque page de détail d'un meme et sur la route `/random`.

**Fix suggéré :**
```ts
// Option A : SQL random (1 seule ligne)
const [randomMeme] = await prismaClient.$queryRaw<MemeWithVideo[]>`
  SELECT m.*, row_to_json(v) as video
  FROM "Meme" m
  JOIN "Video" v ON m."videoId" = v."id"
  WHERE m."status" = 'PUBLISHED'
  ${exceptId ? Prisma.sql`AND m."id" != ${exceptId}` : Prisma.empty}
  ORDER BY RANDOM()
  LIMIT 1
`

// Option B : count + offset random (évite ORDER BY RANDOM sur grosses tables)
const count = await prismaClient.meme.count({ where: { status: 'PUBLISHED' } })
const skip = Math.floor(Math.random() * count)
const meme = await prismaClient.meme.findFirst({
  where: { status: 'PUBLISHED', id: { not: exceptId } },
  include: { video: true },
  skip,
})
```

---

### 2. Injection SQL dans `getInfiniteReels` via interpolation de string dans raw query

**Fichier :** `src/server/reels.ts:36-43`

Le tableau `excludedIds` est directement interpolé dans une raw SQL query avec `'${id}'`. `$queryRawUnsafe` empêche aussi Prisma de cacher/préparer le plan de requête. De plus, `ORDER BY RANDOM()` sur de grosses tables est lent.

**Fix suggéré :**
```ts
const memes = await prismaClient.$queryRaw<{ meme: MemeWithVideo }[]>`
  SELECT json_build_object(...) AS meme
  FROM "Meme" m
  JOIN "Video" v ON m."videoId" = v."id"
  WHERE m."status" = 'PUBLISHED'
  ${excludedIds.length
    ? Prisma.sql`AND m."id" != ALL(${excludedIds}::text[])`
    : Prisma.empty}
  ORDER BY RANDOM()
  LIMIT 20
`
```

---

## HIGH

### 3. `getActiveSubscription` double-fetch de la session utilisateur

**Fichier :** `src/server/customer.ts:6-36`

`getActiveSubscription` appelle `getAuthUser()` → `auth.api.getSession({ headers })`. Or chaque appelant est déjà derrière `authUserRequiredMiddleware`, qui fait aussi `auth.api.getSession`. La session est donc récupérée **2 fois** par requête.

Appelé depuis : `getFavoritesMemes`, `checkGeneration`, `toggleBookmark`.

**Fix suggéré :** Refactorer pour accepter le userId en paramètre au lieu de re-fetch la session.

---

### 4. `toggleBookmarkByMemeId` : cascade de 4-6 appels DB séquentiels

**Fichier :** `src/server/user.ts:115-134` + `src/server/user.ts:78-113`

Flow actuel séquentiel :
1. `auth.api.getSession` (middleware)
2. `prismaClient.meme.findUnique` (vérif meme existe)
3. `auth.api.getSession` again (dans `getActiveSubscription`)
4. `prismaClient.userBookmark.findUnique` (check bookmark)
5. Si création : `prismaClient.userBookmark.count` + `getActiveSubscription`
6. `prismaClient.userBookmark.create` ou `delete`

4-6 roundtrips séquentiels pour un simple toggle. À 5ms/roundtrip = 20-30ms de latence pure.

**Fix suggéré :** Utiliser une transaction Prisma et paralléliser les vérifications indépendantes.

---

### 5. `deleteMemeById` : 4 appels externes séquentiels

**Fichier :** `src/server/admin.ts:133-167`

Flow :
1. `prismaClient.meme.delete`
2. `prismaClient.video.delete` (redondant — `onDelete: Cascade` devrait gérer)
3. `algoliaClient.deleteObject`
4. `deleteVideo` (Bunny CDN)

Les étapes 2-4 sont indépendantes et pourraient être parallélisées. L'étape 2 est probablement inutile (cascade FK).

**Fix suggéré :**
```ts
const meme = await prismaClient.meme.delete({
  where: { id: memeId },
  include: { video: true }
})
// Video cascade-deletes via FK. External cleanup en parallèle :
await Promise.all([
  algoliaClient.deleteObject({ indexName, objectID: meme.id }).catch(console.error),
  deleteVideo(meme.video.bunnyId).catch(console.error),
])
```

---

### 6. `shareMeme` proxy la vidéo entière (jusqu'à 16 MB) à travers Node.js

**Fichier :** `src/server/meme.ts:161-191`

La fonction fetch une vidéo entière depuis Bunny CDN en `Blob` en mémoire serveur, puis la renvoie au client. Avec 10 requêtes concurrentes = 160 MB de pression heap.

**Fix suggéré :** Retourner une redirection vers le CDN ou streamer la réponse au lieu de buffer :
```ts
// Option A : Redirect
return new Response(null, { status: 302, headers: { Location: originalUrl } })

// Option B : Stream
const response = await fetch(originalUrl)
return new Response(response.body, {
  headers: { 'Content-Type': response.headers.get('Content-Type')! }
})
```

---

### 7. Cron `sync-algolia` charge TOUS les memes + relations en mémoire d'un coup

**Fichier :** `crons/sync-algolia.ts:8-23`

`findMany()` sans limit ni pagination. À 50 000 memes avec relations = 500 MB+ de mémoire.

**Fix suggéré :** Traiter par batch de 500 avec cursor-based pagination.

---

### 8. Cron `update-title-bunny` : boucle séquentielle avec délai de 250ms

**Fichier :** `crons/update-title-bunny.ts:26-50`

Charge tous les memes (unbounded `findMany`), puis itère séquentiellement avec 250ms de délai entre chaque appel API. Pour 1 000 memes = ~4 min, 10 000 memes = ~42 min.

**Fix suggéré :** Utiliser de la concurrence contrôlée (`p-limit` avec 5 workers parallèles).

---

## MEDIUM

### 9. `getFavoritesMemes` refetch le statut subscription de manière redondante

**Fichier :** `src/server/user.ts:14-49`

Appelle `getActiveSubscription()` à chaque invocation (2 appels réseau) pour déterminer la limite. Le client fetch déjà cette info en parallèle via `getActiveSubscriptionQueryOpts()`.

**Fix suggéré :** Passer le statut de subscription comme paramètre ou depuis le contexte du loader.

---

### 10. Index manquant sur `Meme.status`

**Fichier :** `prisma/schema.prisma:63-81`

Pas d'index sur `status`, pourtant presque toutes les requêtes filtrent sur `status: 'PUBLISHED'` (`getRandomMeme`, `getBestMemes`, reels, favoris).

**Fix suggéré :**
```prisma
model Meme {
  @@index([status])
  @@index([status, viewCount])  // pour getBestMemes
}
```

---

### 11. Webhook Bunny sans vérification d'authentification/signature

**Fichier :** `src/routes/api/bunny.ts:18-83`

Le handler POST accepte n'importe quel JSON valide et met à jour la DB. Pas de vérification de signature webhook, ni de secret partagé, ni de whitelist IP.

**Fix suggéré :** Vérifier la signature du webhook ou ajouter une vérification de header secret.

---

### 12. `getListUsers` limité à 100 utilisateurs sans pagination

**Fichier :** `src/server/admin.ts:27-42`

Hardcodé `limit: 100, offset: 0`. Au-delà de 100 users, le panel admin les ignore silencieusement.

**Fix suggéré :** Ajouter des paramètres de pagination.

---

### 13. `createMemeFromTwitterUrl` garde un buffer de 16 MB en mémoire pendant des appels séquentiels

**Fichier :** `src/server/admin.ts:169-229`

Le buffer vidéo est maintenu en mémoire pendant toute la chaîne d'appels (Bunny create → DB → Algolia → upload). La conversion blob→ArrayBuffer→Buffer triple temporairement l'utilisation mémoire.

**Fix suggéré :** Paralléliser upload Bunny + indexation Algolia, et libérer le buffer dès que possible.

---

## LOW

### 14. `editMeme` : deleteMany + create pour les catégories au lieu d'un diff

**Fichier :** `src/server/admin.ts:96-98`

Chaque édition supprime TOUTES les relations catégories et les recrée, même si seul le titre ou statut a changé. Write amplification inutile.

**Fix suggéré :** Calculer le diff (catégories à ajouter / supprimer).

---

### 15. `getCategories` sans limit ni hint de cache

**Fichier :** `src/server/categories.ts:12-22`

`findMany` sans borne. Le client a un `staleTime` de 10 min, mais la server function n'a pas de cache. Les catégories changent rarement mais sont fetch à chaque navigation.

---

### 16. `checkGeneration` et `toggleBookmark` font des appels DB séparés qui pourraient être combinés

**Fichier :** `src/server/user.ts:51-76`

`checkGeneration` fetch le `generationCount` puis appelle `getActiveSubscription()` (session + Stripe). Pourrait être une seule requête + vérification.

---

### 17. Pas de `staleTime` sur plusieurs query options fréquemment utilisées

**Fichier :** `src/lib/queries.ts`

`getAuthUserQueryOpts`, `getMemeByIdQueryOpts`, `getBestMemesQueryOpts`, `getActiveSubscriptionQueryOpts` n'ont pas de `staleTime`. Ils refetch à chaque navigation.

**Fix suggéré :** Ajouter `staleTime: 1000 * 60 * 5` sur ces queries.

---

### 18. PrismaClient sans configuration de logging ni pool de connexions

**Fichier :** `src/db/index.ts:1-20`

Pas de logging de requêtes, pas de tuning du pool de connexions, pas de timeout. En production, les paramètres par défaut peuvent ne pas être optimaux.

---

## Top 5 Quick Wins

1. **Fix `getRandomMeme`** (CRITICAL #1) — Remplacer `findMany` par `ORDER BY RANDOM() LIMIT 1`. 1 fichier, réduction massive de mémoire et charge DB.
2. **Fix injection SQL `getInfiniteReels`** (CRITICAL #2) — Passer de `$queryRawUnsafe` à `$queryRaw` avec tagged template literals.
3. **Ajouter `@@index([status])` et `@@index([status, viewCount])`** (MEDIUM #10) — 1 migration, accélère toutes les requêtes les plus utilisées.
4. **Paralléliser `deleteMemeById`** (HIGH #5) — Passer de 4 awaits séquentiels à `Promise.all`. Économie de 100-400ms par suppression.
5. **Ajouter `staleTime` aux query options** (LOW #17) — Quelques lignes dans `queries.ts` pour éviter les refetch inutiles.

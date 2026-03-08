# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Better Auth (v1.5.3)

**Type `UserWithRole` vs `InferUser` :** Bug interne où `UserWithRole.role` est `string | undefined` mais le type inféré retourne `string | null | undefined`. Fix appliqué : type `SessionUser` custom dans `src/lib/role.ts`.

- [ ] Ouvrir une issue upstream sur Better Auth pour aligner `UserWithRole.role` avec le type inféré

**Issues à surveiller :** [#2596](https://github.com/better-auth/better-auth/issues/2596), [#3033](https://github.com/better-auth/better-auth/issues/3033), [#7452](https://github.com/better-auth/better-auth/issues/7452)

---

## Algolia — Items reportés

### Activer les modèles Recommend (quand suffisamment d'events)

- [ ] Activer "Related Items" dans le dashboard Algolia → Recommend
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent

### Boucle d'amélioration continue

- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

---

## Migration Railway → Vercel — Items restants

- [x] Réactiver Sentry server-side tracing — `wrapFetchWithSentry` dans `src/server.ts`, global middlewares (`sentryGlobalRequestMiddleware`/`sentryGlobalFunctionMiddleware`) dans `src/start.ts`, `wrapMiddlewaresWithSentry` sur tous les middlewares custom (`authUserRequired`, `adminRequired`, `rateLimit`). L'instrumentation ORM/third-party reste limitée sans `--import` (ESM incompatible dans Vercel serverless, [sentry-javascript#18859](https://github.com/getsentry/sentry-javascript/issues/18859)).

## Nitro — Override runtime Node.js 24

**Problème :** Nitro `3.0.1-alpha.2` ne supporte pas Node.js 24 dans sa liste `SUPPORTED_NODE_VERSIONS` ([nitrojs/nitro#3965](https://github.com/nitrojs/nitro/issues/3965)). Il fallback sur `nodejs22.x`, ce qui casse Paraglide (utilise `URLPattern`, disponible nativement à partir de Node 23+).

**Fix temporaire :** Override manuel dans `vite.config.ts` :
```ts
nitro({
  preset: 'vercel',
  vercel: {
    functions: {
      runtime: 'nodejs24.x'
    }
  },
})
```

**Fix upstream :** PR [nitrojs/nitro#3967](https://github.com/nitrojs/nitro/pull/3967) mergée mais pas encore publiée sur npm (dernière version : `3.0.1-alpha.2`).

- [ ] Surveiller les releases Nitro (`npm view nitro versions`). Quand une version ≥ `3.0.1` inclut le support Node 24, supprimer le bloc `vercel.functions.runtime` de `vite.config.ts`.

---

## Google Images SEO (audit mars 2026)

Audit basé sur les recommandations Google Images mises à jour le 2 mars 2026 (https://developers.google.com/search/docs/appearance/google-images).

### Contexte

Le site est un catalogue de mèmes vidéo. Chaque mème a un thumbnail JPG et un preview WebP servis par Bunny CDN. Les images statiques (logo, avatars, templates) sont en PNG/WebP dans `/public/images/`. Le JSON-LD utilise déjà `VideoObject` avec `thumbnailUrl`. L'OG image est bien configuré avec dimensions. Le lazy loading et le `fetchPriority="high"` sont en place.

### Priorité 1 — `primaryImageOfPage` dans le JSON-LD

**Quoi :** Ajouter la propriété Schema.org `primaryImageOfPage` dans le JSON-LD des pages meme (`/memes/:id`). C'est le signal le plus fort que Google utilise pour choisir quelle image afficher dans Google Images.

**Pourquoi :** Actuellement le JSON-LD contient un `VideoObject` avec `thumbnailUrl`, mais rien n'indique explicitement que cette image est LA représentation visuelle de la page. Google peut alors choisir n'importe quelle image de la page (le logo, un avatar, etc.). Avec `primaryImageOfPage`, on contrôle exactement ce qui apparaît.

**Comment :** Dans `src/lib/seo.ts`, fonction `buildMemeJsonLd()`, ajouter un `WebPage` wrapper ou enrichir le JSON-LD existant avec `primaryImageOfPage` pointant vers le thumbnail Bunny CDN. Pattern :
```json
{
  "@type": "WebPage",
  "primaryImageOfPage": {
    "@type": "ImageObject",
    "contentUrl": "https://vz-xxx.b-cdn.net/{videoId}/thumbnail.jpg"
  },
  "mainEntity": { "@type": "VideoObject", ... }
}
```

**Fichier :** `src/lib/seo.ts`

- [x] Ajouter `primaryImageOfPage` (ImageObject) dans le JSON-LD des pages meme
- [x] Vérifier avec le Rich Results Test de Google après déploiement

### Priorité 2 — Images dans le sitemap

**Quoi :** Ajouter les balises `<image:image>` dans le sitemap XML existant pour les pages meme.

**Pourquoi :** Les thumbnails sont hébergées sur un domaine Bunny CDN différent du site. Google peut ne pas les découvrir automatiquement. Le sitemap image est le moyen recommandé pour signaler des images sur des domaines externes (CDN). Un sitemap vidéo existe déjà mais ne contient pas les métadonnées image.

**Comment :** Dans `src/routes/sitemap[.]xml.ts`, pour chaque entrée de page meme, ajouter :
```xml
<url>
  <loc>https://petit-meme.com/memes/{slug}</loc>
  <image:image>
    <image:loc>https://vz-xxx.b-cdn.net/{videoId}/thumbnail.jpg</image:loc>
    <image:title>{meme.title}</image:title>
  </image:image>
</url>
```
Ne pas oublier le namespace `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` dans la balise `<urlset>`.

**Fichier :** `src/routes/sitemap[.]xml.ts`

- [x] Ajouter le namespace image dans le sitemap
- [x] Ajouter `<image:image>` avec `<image:loc>` et `<image:title>` pour chaque page meme

### Priorité 3 — Responsive images (`srcset`) sur les thumbnails

**Quoi :** Utiliser `srcset` et `sizes` sur les `<img>` de thumbnails pour servir des images adaptées à la taille de l'écran.

**Pourquoi :** Actuellement chaque thumbnail est servie en résolution unique quelle que soit la taille d'écran. Sur mobile, on télécharge une image trop grande. Cela impacte les Core Web Vitals (LCP) et donc le ranking Google. Bunny CDN supporte la transformation d'images via query params (`?width=X&height=Y`).

**Comment :** Dans `src/lib/bunny.ts`, enrichir `buildVideoImageUrl()` pour accepter des dimensions optionnelles. Puis dans `src/components/Meme/meme-video-thumbnail.tsx` et `src/routes/_public__root/_default/memes/$memeId.tsx`, ajouter `srcset` avec 2-3 tailles (ex: 480w, 768w, 1280w) et un attribut `sizes` correspondant à la grille CSS.

**Pré-requis :** Vérifier que Bunny CDN supporte les query params de redimensionnement sur les thumbnails vidéo (pas seulement sur le CDN image). Si non supporté, cette tâche est annulée.

**Fichiers :** `src/lib/bunny.ts`, `src/components/Meme/meme-video-thumbnail.tsx`, `src/routes/_public__root/_default/memes/$memeId.tsx`

- ~~Annulé : Bunny CDN ne supporte pas les query params de resize sur les thumbnails vidéo~~

### Priorité 4 — Alt text plus descriptifs (quick fixes)

**Quoi :** Améliorer les alt text trop vagues sur le logo et les avatars.

**Pourquoi :** Google extrait le contexte des images via l'alt text. "Logo" et "Avatar" n'apportent aucune information. Les guidelines recommandent un alt descriptif et pertinent (ex: `alt="Dalmatian puppy playing fetch"` plutôt que `alt="puppy"`).

**Détails :**
- Logo `alt="Logo"` → `alt="Petit Meme"` dans `src/components/navbar.tsx`
- Avatars `alt="Avatar"` → `alt="Photo de profil de {username}"` (ou `alt={username}` si le nom est disponible) dans les composants qui utilisent `<AvatarImage>`

**Fichiers :** `src/components/navbar.tsx`, composants utilisant `<AvatarImage>`

- [x] Changer alt du logo → "Petit Meme"
- [x] Changer alt des avatars → inclure le nom d'utilisateur quand disponible

### Non retenu pour l'instant

- **AVIF** : Google l'indexe mais Bunny CDN ne le supporte pas en transformation automatique sur les thumbnails vidéo. Pas de gain sans pipeline de conversion côté serveur, et le coût Vercel Hobby ne le permet pas.
- **URLs d'images inconsistantes** : Vérifié — `buildVideoImageUrl()` retourne toujours la même URL déterministe sans token ni timestamp. Pas d'action nécessaire.

---

## Google Video SEO (audit mars 2026)

Audit basé sur les recommandations Google Video SEO (https://developers.google.com/search/docs/appearance/video).

### Changements appliqués

- [x] `max-video-preview:-1` dans le robots meta global (`__root.tsx`) — autorise Google à générer des aperçus vidéo sans limite de durée
- [x] `og:type: video.other` + meta OG vidéo (`og:video`, `og:video:secure_url`, `og:video:type`, `og:video:width`, `og:video:height`) sur les pages meme — signale aux plateformes que la page contient une vidéo
- [x] Video sitemap (`<video:video>` avec `thumbnail_loc`, `title`, `description`, `content_loc`, `player_loc`, `duration`, `publication_date`) — aide Google à découvrir et indexer les vidéos
- [x] Suppression du `aggregateRating` fictif (4.8/5, 85 reviews) — données structurées fabricated = risque de pénalité Google

### Items restants

- [x] Vérifier avec le Rich Results Test de Google après déploiement (images + vidéo)
- [ ] Surveiller le Video Indexing Report dans Search Console après déploiement
- [x] `max-image-preview:large` dans le robots meta — autorise Google à afficher de grandes vignettes d'images dans les SERP
- [ ] Stocker `width`/`height` dans le modèle `Video` (migration additive) — permet des `og:video:width/height` corrects par meme au lieu du 1280x720 hardcodé. Utile si des memes verticaux/carrés sont ajoutés
- [x] Ajouter `<video:family_friendly>yes</video:family_friendly>` dans le video sitemap — signal SafeSearch explicite
- [x] Ajouter `name` et `description` uniques sur les pages catégorie en JSON-LD `CollectionPage` — déjà implémenté dans `buildCategoryJsonLd`
- [x] Noms de fichiers descriptifs pour les images statiques — `logo.png` renommé en `petit-meme-logo.png`

---

## CSS — Quick wins

### Fix autofill ugly background (dark mode)

Le style natif `autofill` des navigateurs applique un fond bleu/jaune qui casse le design, surtout en dark mode.

**Fix :** Utiliser un inset shadow hack en Tailwind pour forcer la couleur de fond :
```
autofill:shadow-[inset_0_0_0px_1000px_var(--color-background)]
```

- [x] Appliquer le fix autofill sur tous les `<input>` concernés (login, signup, etc.)

### Supprimer le spinner de loading sur la page pricing

La page pricing utilise `useSuspenseQuery(getActiveSubscriptionQueryOpts())` pour vérifier l'abonnement actif. Quand les données ne sont pas encore en cache (premier accès, utilisateur non connecté), cela déclenche le `defaultPendingComponent` (spinner global `DefaultLoading`) pendant le chargement. La page devrait s'afficher immédiatement sans spinner — l'état d'abonnement peut être résolu sans bloquer le rendu.

**Fichier :** `src/routes/_public__root/_default/pricing/index.tsx`

- [x] Remplacer `useSuspenseQuery` par `useQuery` pour `getActiveSubscriptionQueryOpts()` afin que la page s'affiche immédiatement sans suspense/spinner
- [x] Adapter la logique `hasActiveSubscription` / `isOnFreePlan` pour gérer l'état `isPending` (afficher le plan free par défaut pendant le chargement, ou masquer le badge "actif" tant que la requête n'est pas terminée)

---

## Rate Limiting & Server Call Optimization (mars 2026)

**Contexte :** Vercel Firewall rate limit rule (`/_server`, 30 req/60s/IP) déclenchait des 429 "Too Many Requests" lors de navigations rapides entre mèmes. Chaque page mème faisait 6 server calls (3 loader + 3 preload).

### Changements appliqués

- [x] Suppression du preload du prochain mème aléatoire (`useEffect` qui appelait `router.preloadRoute`) — économise 3 server calls par page
- [x] `getRelatedMemes` déplacé du loader vers un `useQuery` client-side dans `RelatedMemes` — déféré, ne bloque plus le rendu
- [x] `getRandomMeme` déplacé du loader vers un `useQuery` client-side — déféré, ne bloque plus le rendu
- [x] Ajout retry avec backoff exponentiel sur les erreurs 429 dans le `QueryClient` (max 3 retries, délai 2s/4s/8s)
- [x] Helper `matchIsRateLimitError` dans `src/helpers/error.ts`

**Résultat :** Loader réduit à 1 server call (`getMemeById`), le reste est déféré. ~3x moins de calls par navigation.

### Items restants

- [x] Envisager d'augmenter la limite Vercel Firewall (30 → 60+ req/60s) si les 429 persistent après fix code

---

## Backlog — Futures évolutions

### Admin — Items reportés

- [ ] Rate limiting sur les preview deployments Vercel (infra)
- [ ] Rate limiting dédié sur le tracking share/download (dédoublonnage par user/meme)
- `getListUsers` extraction bloquée : module-level functions using `prismaClient` break Vite client bundle (TanStack Start only strips `.handler()` body)
- Bans temporaires (`banExpires`) — non prioritaire
- Extraction sous-composants `categories/`, `library/`, `downloader.tsx`

### Internationalisation (FR / EN)

Phases 0, 1, 1.5 terminées. Interface bilingue FR/EN + 11 email templates traduits.

**Phase 2 — Contenu mèmes + Algolia bilingue :** Plan détaillé dans `.claude/plan-i18n-content.md`

- [x] Phase 2.0 — Schema DB (enum `MemeContentLocale`, tables `MemeTranslation`/`CategoryTranslation`)
- [ ] Phase 2.1 — Admin (page mème complète, select contentLocale, sections traduction, catégories)
- [x] Phase 2.2 — Couche serveur (résolution locale, filtrage contentLocale, SEO, cache locale-aware)
- [ ] Phase 2.3 — Algolia (index par locale, migration index existant, sync multi-index, Insights locale-aware)
- [ ] Phase 2.4 — Frontend & SEO (sitemap hreflang filtré, badge langue, catégories virtuelles Paraglide)

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

### Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : CDN/cache, SSL, protection DDoS, Page Rules, etc.


# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Cleanup branches — Retour sur main ✅

Terminé le 2026-03-09. Toutes les branches mergées dans `main`, production branch Vercel et default branch GitHub pointent sur `main`. Branches supprimées : `feat/migrate-to-vercel`, `feat/i18n`, `feat/i18n-content`, `feat/sentry-server-tracing`.

- [x] Merge `feat/migrate-to-vercel` → `main` (fast-forward)
- [x] Vercel : Production Branch → `main` (Settings → Environments → Production)
- [x] GitHub : Default branch → `main`
- [x] Supprimer toutes les branches mortes (local + remote)
- [x] Mettre à jour README.md (références à `feat/migrate-to-vercel` → `main`)
- [x] Vérifier que le deploy Vercel se déclenche bien sur push `main`

---

## Better Auth (v1.5.3)

**Type `UserWithRole` vs `InferUser` :** Bug interne où `UserWithRole.role` est `string | undefined` mais le type inféré retourne `string | null | undefined`. Fix appliqué : type `SessionUser` custom dans `src/lib/role.ts`.

- [ ] Ouvrir une issue upstream sur Better Auth pour aligner `UserWithRole.role` avec le type inféré

**Issues à surveiller :** [#2596](https://github.com/better-auth/better-auth/issues/2596), [#3033](https://github.com/better-auth/better-auth/issues/3033), [#7452](https://github.com/better-auth/better-auth/issues/7452)

---

## Algolia — Optimisation billing Recommend

**Problème (2026-03-13) :** 21 442 recommend requests/mois (214% du free tier de 10 000) → 6€/mois d'overage. Cause : l'in-memory cache (`withAlgoliaCache`) est inutile sur Vercel serverless (cold starts), chaque SSR = 1 appel Algolia Recommend.

**Solution :** Cache persistant en DB (table Prisma `RecommendCache`) avec TTL long. Les résultats Algolia Recommend sont stockés en base et réutilisés. Algolia n'est appelé que quand le cache expire.

### Cache DB Algolia Recommend

- [x] **Migration Prisma** : table `RecommendCache` (key PK, data Json, expiresAt, createdAt). Index sur `expiresAt`. Schema ajouté, Prisma Client régénéré. **Migration à créer par l'utilisateur** (`prisma migrate dev`).
- [x] **`getTrendingMemes`** : lire cache DB (`trending:{locale}`) → si valide, retourner. Sinon appeler Algolia Recommend, écrire en cache (TTL 24h) via `upsert`. Fallback inchangé : `getBestMemesInternal()` si Algolia échoue.
- [x] **`getRelatedMemes`** : lire cache DB (`related:{locale}:{memeId}`) → si valide, retourner. Sinon appeler Algolia Recommend, écrire en cache (TTL 7 jours) via `upsert`. Fallback inchangé : `[]` si Algolia échoue.
- [x] **`clearRecommendCache()`** : helper qui fait `DELETE FROM recommend_cache` (max ~1K rows, instantané). Appelé depuis `deleteMemeById` et `editMeme` quand le status quitte PUBLISHED (PUBLISHED → ARCHIVED/REJECTED). Évite les mèmes fantômes (404 au clic) dans le cache.
- [x] **Cleanup opportuniste** : lors de chaque écriture cache (`upsert`), supprimer les rows expirées (`WHERE expires_at < NOW()`). Pas de cron dédié — évite de réveiller Neon inutilement.
- [x] **Supprimer le cache in-memory pour recommend** : retiré `withAlgoliaCache` des appels recommend dans `src/server/meme.ts`. Le cache in-memory reste pour les search (non-recommend).
- [x] **Cleanup** : supprimé `ALGOLIA_RECOMMEND_CACHE_TTL` de `src/lib/algolia.ts` (plus utilisé).

**Décisions :**
- Storage : table Prisma dans Neon (pas de nouveau service)
- TTL trending : 24h (~30 appels/mois × 2 locales)
- TTL related : 7 jours (~73 appels/mois max, en pratique moins — seuls les mèmes vus sont cachés)
- Invalidation : TTL naturel pour les nouveaux publishes + `clearRecommendCache()` sur delete/archive
- Cache par locale : une entrée par locale (clés `trending:fr`, `related:en:{memeId}`)
- Fallback : identique à l'existant (DB pour trending, `[]` pour related)
- Écriture : `upsert` (INSERT ON CONFLICT UPDATE) — gère les écritures concurrentes sans corruption
- Estimation : ~100 req Algolia/mois (vs 21 442) → bien dans le free tier

**Trade-offs acceptés :**
- Titre/description stale après un edit metadata-only → max 7j pour related, 24h pour trending. Non critique pour une sidebar.
- Nouveau mème publié n'apparaît pas dans trending/related avant expiration TTL → normal, le ML Algolia a aussi besoin de temps pour accumuler des signaux.
- Studio page (`memes.$memeId.studio.tsx`) bénéficie automatiquement du cache DB car elle appelle le même `getRelatedMemes`.

### Activer les modèles Recommend (quand suffisamment d'events)

- [ ] Activer "Related Items" dans le dashboard Algolia → Recommend
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent

### Boucle d'amélioration continue

- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

---

## Tailwind — Enrichir l'agent tailwind-audit avec `canonicalize`

**Contexte :** Tailwind v4 introduit une API `canonicalizeCandidates` qui remplace automatiquement les classes dépréciées ou verbeuses par leur forme canonique (ex: `break-words` → `wrap-break-word`, `bg-gradient-to-r` → `bg-linear-to-r`, `w-6 h-6` → `size-6`). La commande CLI `tailwindcss canonicalize` a été [mergée le 2026-03-11](https://github.com/tailwindlabs/tailwindcss/pull/19783) mais pas encore publiée (dernière release : v4.2.1).

**Action :** Quand la release incluant `canonicalize` sort (v4.2.2 ou v4.3.0), enrichir l'agent `.claude/agents/tailwind-audit.md` pour qu'il référence la liste complète des canonicalisations et les intègre dans son audit checklist. Sources à exploiter :
- [`canonicalize-candidates.ts`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/src/canonicalize-candidates.ts) — pipeline de 9 stratégies de canonicalisation
- [`canonicalize-candidates.test.ts`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/src/canonicalize-candidates.test.ts) — tous les cas de remplacement
- [`migrate-simple-legacy-classes.ts`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/%40tailwindcss-upgrade/src/codemods/template/migrate-simple-legacy-classes.ts) — renommages simples v3→v4
- [`migrate-legacy-classes.ts`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/%40tailwindcss-upgrade/src/codemods/template/migrate-legacy-classes.ts) — renommages theme-aware

**En attendant :** `npx @tailwindcss/upgrade` fonctionne déjà sur un projet v4 (idempotent depuis v4.1.5, [PR #17717](https://github.com/tailwindlabs/tailwindcss/pull/17717)) et applique les canonicalisations.

- [ ] Surveiller les releases Tailwind (`npm view tailwindcss versions`). Quand `canonicalize` est disponible, mettre à jour l'agent tailwind-audit.

---

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

## SEO — Items restants

- [x] Fix page `/submit` SEO : supprimé `noindex`, ajouté keywords + meta description enrichie + breadcrumb JSON-LD + intro visible par crawlers + règles de soumission hors auth gate + ajouté au sitemap
- [x] Sitemap index : split monolithique `/sitemap.xml` → index + 3 sub-sitemaps (`sitemap-static.xml`, `sitemap-categories.xml`, `sitemap-memes.xml`). Utilitaires partagés extraits dans `src/lib/sitemap.ts`. Cache granulaire : 24h pour index/static, 1h pour catégories/mèmes. Le sitemap index et static ne touchent pas la DB.
- [ ] Surveiller le Video Indexing Report dans Search Console
- [ ] Stocker `width`/`height` dans le modèle `Video` (migration additive) — permet des `og:video:width/height` corrects par meme au lieu du 1280x720 hardcodé

---

## Backlog — Futures évolutions

### Admin — Items reportés

- [ ] Rate limiting sur les preview deployments Vercel (infra)
- [ ] Rate limiting dédié sur le tracking share/download (dédoublonnage par user/meme)
- `getListUsers` extraction bloquée : module-level functions using `prismaClient` break Vite client bundle (TanStack Start only strips `.handler()` body)
- Bans temporaires (`banExpires`) — non prioritaire
- Extraction sous-composants `categories/`, `library/`, `downloader.tsx`

### Internationalisation (FR / EN)

Phases 0–2.4 terminées et déployées en prod (2026-03-09). Interface bilingue FR/EN, 11 email templates traduits, contenu DB localisé, Algolia multi-index par locale.

### Bugs i18n : locale non respectée dans plusieurs endroits

**Reels** (`src/server/reels.ts`) — raw SQL sans filtre `contentLocale`, titres non résolus via `MemeTranslation`

- [x] Ajouter `getLocale()` + filtre via `Prisma.sql` template literal (pas de string concat — prévention SQL injection) : `AND m."content_locale" IN (${Prisma.join(VISIBLE_CONTENT_LOCALES[locale])})`
- [x] Résoudre les titres via `MemeTranslation` (query séparée + `resolveMemeTranslation()`)
- [x] Index `meme_status_content_locale_idx` existe — non pertinent à vérifier avec ~510 mèmes (PostgreSQL préfère le seq scan sur les petites tables)

**Algolia Recommend** (`src/server/meme.ts`) — `getTrendingMemes` et `getRelatedMemes` sans filtre `contentLocale`

- [x] Ajouter filtre `contentLocale` dans `getTrendingMemes` via `VISIBLE_CONTENT_LOCALES[locale]`
- [x] Ajouter filtre `contentLocale` dans `getRelatedMemes` (queryParameters + fallbackParameters)
- [x] Helper `buildAlgoliaContentLocaleFilter(contentLocales)` extrait pour DRY (utilisé aussi par `buildMemeFilters`)
- [x] `getBestMemesInternal()` : inclure `translations` + `resolveMemeTranslation()` pour résoudre titre/description dans la locale courante (fallback quand Algolia Recommend indispo)

**Favoris** (`src/server/user.ts` — `getFavoritesMemes()`) — pas d'include `translations`, pas de résolution locale

- [x] Inclure `translations` dans la query Prisma des favoris
- [x] Résoudre via `resolveMemeTranslation()` avant de retourner les mèmes

**Export GDPR** (`src/server/user.ts` — `exportUserData()`) — utilise `bookmark.meme.title` brut

- [x] Résoudre les titres des bookmarks via `MemeTranslation` dans l'export

**AI generation** (`src/server/ai.ts` — `generateMemeContent()`) — passe `meme.title` brut à Gemini

- [x] Résoudre le titre via `MemeTranslation` avant de le passer à Gemini (utilise `CONTENT_LOCALE_TO_LOCALE[meme.contentLocale]` comme locale cible)

### Filtre langue dans la liste des mèmes

Permettre à l'utilisateur de filtrer par langue du contenu, indépendamment de sa locale.

**UI : dropdown multi-select "Langues"**

- Bouton avec icône globe + nombre de langues sélectionnées (ex: "Langues (2)")
- Au clic : popover avec liste de checkboxes, une par langue disponible (🇫🇷 Français, 🇬🇧 English, etc.)
- UNIVERSAL n'apparaît jamais dans la liste (toujours inclus implicitement)
- Par défaut : langues pré-cochées selon la locale (`VISIBLE_CONTENT_LOCALES`) — FR → FR+EN cochés, EN → EN coché
- L'utilisateur coche/décoche librement n'importe quelle combinaison
- Scalable à N langues sans changement de composant

**Implémentation :**

- [x] Ajouter `filterOnly(contentLocale)` dans `attributesForFaceting` des index Algolia (via `scripts/setup-algolia-indices.ts` + appliquer en dev/prod + reindex)
- [x] Composant `MemesFilterLanguage` dans `src/components/Meme/Filters/memes-filter-language.tsx` — popover + checkboxes, state dans les query params URL (`?contentLocales=FR,EN` pour partage/bookmark)
- [x] Paramètre `contentLocales` (string comma-separated) dans `MEMES_SEARCH_SCHEMA` + `getMemes()` (`src/server/meme.ts`) — facet filter Algolia `(contentLocale:FR OR contentLocale:UNIVERSAL)`
- [x] Quand des langues hors locale sont sélectionnées (ex: utilisateur EN coche FR) : requêter l'index `_fr` (qui contient tout) au lieu de `_en` — via `resolveSearchIndex` avec `effectiveLocale`
- [x] Adapter `getRandomMeme()` et `getBestMemesInternal()` pour respecter le filtre si actif
- [x] Edge case : au moins une langue doit rester cochée — désactiver le uncheck quand il ne reste qu'une seule langue sélectionnée
- [x] Helpers `parseContentLocalesParam` / `serializeContentLocalesParam` dans `src/helpers/i18n-content.ts`
- [x] Constants `FILTERABLE_CONTENT_LOCALES` / `DEFAULT_CONTENT_LOCALE_FILTER` dans `src/helpers/i18n-content.ts`
- [x] Pagination préserve `contentLocales` dans les search params

### Phase 2.5 — Tagging, traduction et outils admin

510 mèmes en prod, tous taggés FR par défaut. ~100 sont en réalité en anglais et doivent être retaggés EN avec une traduction EN. L'ordre d'exécution est important.

**Step 0 — Triage manuel contentLocale** ✅

- [x] Triage des ~510 mèmes terminé
- [x] Code triage supprimé (page admin, server functions, composant BunnyVideoPlayer, lien sidebar, query options)
- [x] Champ `contentLocaleReviewed` supprimé (migration `drop_content_locale_reviewed`)
- [x] **Reindex Algolia** en prod

**Étape 1 — Outils admin**

- [x] **Filtre contentLocale dans la library admin** — dropdown pour filtrer par FR/EN/UNIVERSAL, composant `MemesFilterContentLocale` dans `src/routes/admin/-components/`, filtre Algolia via `contentLocale:X`

**Étape 2 — Traduction batch (terminée)** ✅

Traduction EN des mèmes UNIVERSAL réalisée via script one-shot (`scripts/migrate-en-memes.ts`, supprimé après usage). Gemini 2.5 Flash analyse les vidéos + métadonnées FR, génère titre/description/keywords EN. 120 mèmes UNIVERSAL traduits, 24 mèmes EN-only traduits (FR ajouté). Données vérifiées en prod, script supprimé du repo.

**Étape 3 — Finalisation**

- [x] Reindex Algolia en prod (`scripts/reindex-memes.ts`) — refléter les traductions EN dans les index de recherche
- [x] Composant `MemeLanguageBadge` dans `src/components/Meme/meme-language-badge.tsx` — SVG flag (+ label optionnel via `showLabel`), type-safe `Exclude<MemeContentLocale, 'UNIVERSAL'>`, pas de Badge wrapper (texte muted inline)
- [x] Helper `matchIsContentLocaleForeign` dans `src/helpers/i18n-content.ts` — type guard, retourne true si contentLocale ≠ UNIVERSAL et ≠ locale utilisateur
- [x] Page mème (`$memeId.tsx`) : badge avec label au-dessus de la date (dans `MemeInfo`), affiché seulement si non-UNIVERSAL
- [x] Listes de mèmes (`meme-list-item.tsx`) : flag seul, affiché uniquement quand la langue diffère de la locale utilisateur (pas de bruit visuel quand tout match)
- [x] SVG flags (lipis/flag-icons) : `flag-fr.tsx`, `flag-gb.tsx` dans `src/components/icon/`, records `LOCALE_FLAGS` et `CONTENT_LOCALE_FLAGS` dans `flags.ts` — remplace tous les emojis drapeaux dans le codebase (language switcher, locale banner, filtres, admin forms)

### Items i18n reportés

- [ ] Synonymes EN Algolia — ajouter via dashboard quand contenu EN atteint une masse critique
- [ ] Sync incrémentale Algolia — tracker `updatedAt` au lieu de `replaceAllObjects` dans le cron (optimisation future)
- [ ] 3e langue — le schema DB est prêt (mapping `locale → contentLocales[]`), pas d'implémentation prévue pour l'instant

### Propositions de mèmes par les utilisateurs ✅

Terminé. 5 phases livrées : fondations DB, page `/submit`, interface admin `/admin/submissions`, notifications email, audits complets.

- [x] **Cron rappel submissions pending** — `/api/cron/pending-submissions-reminder`, toutes les 72h (9h UTC), envoie un email admin listant les submissions `PENDING` (skip si aucune). Template `pending-submissions-reminder-email.tsx`, FR-only (admin notification).

#### Validation vidéo Twitter sur `/submit`

Vérifier que le tweet contient une vidéo avant d'accepter la soumission. Twitter uniquement (pas YouTube). Validation au submit côté serveur. Si API Twitter down → bloquer.

- [x] Vérification tweet dans `createMemeSubmission` : si `urlType === TWEET`, appeler `getTweetByUrl` — throw `StudioError` codes `TWEET_NO_VIDEO` / `TWEET_VERIFICATION_FAILED`
- [x] Mapping erreurs dans `submission-form.tsx` (`getSubmissionErrorMessage`)
- [x] Messages Paraglide FR/EN : "Ce tweet ne contient pas de vidéo" + "Impossible de vérifier le tweet, réessayez"
- [x] Refacto : `getTweetByUrl` extrait dans `src/lib/react-tweet.ts`, réutilisé par admin (`createMemeFromTwitterUrl`, `getTweetFromUrl`), submission, et seed. `TweetNoVideoError` typé pour distinguer "pas de vidéo" vs "API down".
- [ ] **Bug sérialisation** : `customErrorAdapter` dans `start.ts` sérialise côté serveur (tag `$TSR/t/custom-error`) mais le plugin n'est pas enregistré côté client → erreur seroval à la désérialisation. Affecte TOUS les `StudioError` throwés depuis des server functions (PREMIUM_REQUIRED, UNAUTHORIZED, etc.) — jamais testé jusqu'ici. À investiguer : restart dev server, vérifier si `createStart` enregistre les adapters côté client, ou changer d'approche.

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

### Login Discord

Ajouter Discord comme provider OAuth en plus de Twitter/X. Better Auth supporte Discord nativement.

- [ ] Créer une app Discord (Discord Developer Portal) — récupérer Client ID + Client Secret
- [ ] Ajouter le provider Discord dans la config Better Auth (`src/lib/auth.tsx`) — scopes `identify` + `email` (gérés automatiquement par Better Auth)
- [ ] Ajouter les env vars `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` dans `src/env/server.ts` (validation Zod) + `.env.development` + Vercel env prod
- [ ] Bouton "Se connecter avec Discord" dans les formulaires login/signup (`auth-dialog.tsx`)
- [ ] Tester le flow complet (login, link account Discord ↔ Twitter, avatar Discord)

### Navbar sticky avec scroll fade ✅

Navbar sticky `top-0` avec background qui apparaît progressivement au scroll (0→300px). Double implémentation : CSS `animation-timeline: scroll()` pour les navigateurs modernes (Chrome 115+), fallback Framer Motion (`useScroll` + `useTransform`) pour Safari/Firefox. Hook `useScrollFade` dans `src/hooks/use-scroll-fade.ts`. Pattern repris de Patio Paddle Club.

### Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : CDN/cache, SSL, protection DDoS, Page Rules, etc.


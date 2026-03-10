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

## Algolia — Items reportés

### Activer les modèles Recommend (quand suffisamment d'events)

- [ ] Activer "Related Items" dans le dashboard Algolia → Recommend
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent

### Boucle d'amélioration continue

- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

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

- [ ] Surveiller le Video Indexing Report dans Search Console
- [ ] Stocker `width`/`height` dans le modèle `Video` (migration additive) — permet des `og:video:width/height` corrects par meme au lieu du 1280x720 hardcodé

---

## Backlog — Futures évolutions

- [ ] Supprimer duplicata mème "Ratatouille", et "zero espagnol", "noel", "Thierry Henry", "let's go".

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
- [ ] Badge langue optionnel dans les listes de mèmes (pas seulement la page détail)

### Items i18n reportés

- [ ] Synonymes EN Algolia — ajouter via dashboard quand contenu EN atteint une masse critique
- [ ] Sync incrémentale Algolia — tracker `updatedAt` au lieu de `replaceAllObjects` dans le cron (optimisation future)
- [ ] 3e langue — le schema DB est prêt (mapping `locale → contentLocales[]`), pas d'implémentation prévue pour l'instant

### Propositions de mèmes par les utilisateurs

Les utilisateurs connectés peuvent proposer des mèmes à ajouter via un lien. L'admin review et convertit en mème.

**Côté utilisateur :**

- Formulaire simple (accessible depuis la navbar ou une page dédiée)
- Champs : titre (requis), lien (requis), langue audio (FR/EN/UNIVERSAL)
- Types de liens acceptés : lien tweet/X, lien YouTube
- Pas d'URL MP4 directe (risque SSRF — des URLs arbitraires pourraient cibler des services internes)
- Validation URL côté client + serveur : schema Zod strict dans `src/constants/meme-submission.ts`
  - Twitter/X : réutiliser `TWEET_LINK_SCHEMA` existant (whitelist `twitter.com` / `x.com`)
  - YouTube : whitelist `youtube.com` / `youtu.be` + regex video ID
- Pas d'upload de fichier, pas de description (l'admin s'en occupe)
- L'utilisateur doit être connecté
- Feedback : confirmation après soumission, historique de ses propositions (statut : en attente / accepté / refusé)

**Schema DB (migration additive) :**

- [ ] Enum `MemeSubmissionUrlType` (TWEET, YOUTUBE)
- [ ] Enum `MemeSubmissionStatus` (PENDING, APPROVED, REJECTED)
- [ ] Table `MemeSubmission` : `id`, `user_id` (FK User, CASCADE), `title`, `url`, `url_type` (enum), `content_locale` (enum MemeContentLocale), `status` (enum, default PENDING), `admin_note` (optionnel), `meme_id` (FK Meme, nullable — rempli quand converti), `created_at`, `updated_at`
- [ ] Index : `status`, `user_id`, `(status, created_at DESC)`

**Côté admin :**

- [ ] Page admin `/admin/submissions` — liste des propositions avec filtres (status, date, utilisateur)
- [ ] Actions : approuver (ouvre le flow de création de mème pré-rempli avec titre + URL + langue via `createMemeWithVideo`), rejeter (avec note optionnelle), supprimer
- [ ] Quand approuvé et mème créé : lier `MemeSubmission.meme_id` au mème créé
- [ ] Compteur de submissions en attente visible dans la sidebar admin

**Notifications :**

- [ ] Optionnel : email à l'utilisateur quand sa proposition est acceptée/refusée

**Rate limiting :**

- [ ] Rate limit per-user (5 soumissions / 24h) — créer `createUserRateLimitMiddleware` dans `src/server/rate-limit.ts` (le pattern existant est per-IP, celui-ci est per-user via session)

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

### Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : CDN/cache, SSL, protection DDoS, Page Rules, etc.


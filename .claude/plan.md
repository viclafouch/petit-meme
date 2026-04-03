# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Better Auth

**Type `UserWithRole` vs `InferUser` :** Bug interne où `UserWithRole.role` est `string | undefined` mais le type inféré retourne `string | null | undefined`. Fix appliqué : type `SessionUser` custom dans `src/lib/role.ts`.

- [ ] Ouvrir une issue upstream sur Better Auth pour aligner `UserWithRole.role` avec le type inféré

**Issues à surveiller :** [#2596](https://github.com/better-auth/better-auth/issues/2596), [#3033](https://github.com/better-auth/better-auth/issues/3033), [#7452](https://github.com/better-auth/better-auth/issues/7452)

---

## Algolia — Activer les modèles Recommend

- [x] Activer "Related Items" dans le dashboard Algolia → Recommend — content-based filtering activé (2026-04-03) avec attributs `title`, `description`, `keywords`. Modèle en cours d'entraînement. Le code (`getRelatedMemes` + composant `RelatedMemes` sur page slug) est déjà en place avec fallback par titre.
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend — nécessite 10 000 events (604 actuellement). Accélérer via upload CSV d'events passés depuis `MemeViewDaily`.
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent
- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

## SEO — Items restants

- [ ] Surveiller le Video Indexing Report dans Search Console
- [ ] Stocker `width`/`height` dans le modèle `Video` (migration additive) — permet des `og:video:width/height` corrects par meme au lieu du 1280x720 hardcodé

## Admin — Items reportés

- [ ] Rate limiting sur les preview deployments Vercel (infra)
- [ ] Rate limiting dédié sur le tracking share/download (dédoublonnage par user/meme)
- `getListUsers` extraction bloquée : module-level functions using `prismaClient` break Vite client bundle (TanStack Start only strips `.handler()` body)
- Bans temporaires (`banExpires`) — non prioritaire
- Extraction sous-composants `categories/`, `library/`, `downloader.tsx`

## Bug — Sérialisation `customErrorAdapter`

- [ ] **Bug sérialisation** : `customErrorAdapter` dans `start.ts` sérialise côté serveur (tag `$TSR/t/custom-error`) mais le plugin n'est pas enregistré côté client → erreur seroval à la désérialisation. Affecte TOUS les `StudioError` throwés depuis des server functions (PREMIUM_REQUIRED, UNAUTHORIZED, etc.) — jamais testé jusqu'ici. À investiguer : restart dev server, vérifier si `createStart` enregistre les adapters côté client, ou changer d'approche.

## Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

---

## Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

---

## AI Search — Recherche par prompt IA

Feature permettant aux utilisateurs de décrire en langage naturel le mème qu'ils cherchent. Claude Haiku transforme le prompt en query + filtres catégories, puis recherche dans Algolia. Freemium : 3 recherches/mois pour les inscrits gratuits, illimité pour premium.

**Décisions techniques :**
- URL : `/memes/ai-search` (→ `/en/memes/ai-search`)
- Provider IA : Claude Haiku (Anthropic) — fiable, ~$0.40/mois pour 200 recherches (system prompt ~1500 tokens + réponse ~100 tokens par requête)
- Page publique (SEO), dialog login au clic submit si non connecté
- Server function `aiSearchMemes` requiert auth (quota lié au userId). Le côté "public" concerne la page, pas l'API.
- Textarea 300 caractères max, auto-expand, centré sur la page (style v0/ChatGPT). Fallback JS pour Safari (pas de support `field-sizing-content`)
- Options : filtre langue contenu (FR/EN), identique au `contentLocale` filter de la recherche classique (pas la locale du site). Compteur de caractères
- Loading : pas de streaming réel (server function standard, réponse complète). Animation séquentielle côté frontend pour simuler la progression (keywords affichés un par un après réception)
- Résultats : grille classique MemesList/MemeCard, 20 résultats max (hitsPerPage), queryID Algolia inclus pour le tracking click/conversion
- Quota free : 3/mois, reset au 1er (UTC), comptage via table `AiSearchLog`. Race condition acceptée (coût négligeable si un user passe à 4-5)
- Logs admin : prompt, query extraite, categorySlugs extraits, meme IDs retournés, userId, locale, resultCount, date
- Catégories : fetch dynamique depuis le cache mémoire existant (`getCategories`, TTL 24h)
- Langue : le filtre `contentLocale` détermine quels mèmes sont retournés. La query Haiku est extraite dans la langue de la locale du site (FR ou EN). Recherche dans l'index Algolia de la locale courante (`resolveAlgoliaIndexName`)
- Rate limit : double protection — `createRateLimitMiddleware` (par IP, avant auth) + `createUserRateLimitMiddleware` (par user, 10 req/min)
- Cap global quotidien : 500 recherches/jour tous users confondus (protection contre les abus à grande échelle)
- Navigation : lien navbar + bouton sur la page recherche classique
- Quota épuisé : bouton submit toujours cliquable, affiche un message explicatif + CTA premium vers /pricing (respect de la règle "never disable buttons")
- Design : mobile-first, responsive, expérience optimale sur mobile
- Mise à jour page pricing : ajouter AI Search dans les features free (limited 3/mois) et premium (included, illimité)
- Prompt perdu après login : sauvegarder le prompt dans `sessionStorage` avant d'ouvrir le dialog auth, restaurer après login
- Trialing : un utilisateur en période d'essai a accès illimité (même comportement que premium actif)
- Downgrade premium → free : le quota free s'applique sur le total du mois (recherches premium incluses). Comportement accepté, pas de traitement spécial
- **Pré-requis** : le bug `customErrorAdapter` (section "Bug — Sérialisation") affecte les `StudioError` côté client. `AI_SEARCH_QUOTA_EXCEEDED` sera un `StudioError` — si le bug n'est pas résolu, l'erreur de quota ne se désérialisera pas proprement. Investiguer ou contourner avant Phase 3 (utiliser un fallback error shape si nécessaire)

### Phase 1 — Infrastructure & Setup

- [x] Installer `@tanstack/ai` + `@tanstack/ai-anthropic` (stratégie unifiée TanStack AI avec structured output Zod)
- [x] ~~Créer `src/lib/anthropic.ts`~~ — supprimé, le client est créé via `createAnthropicChat` dans le handler
- [x] Ajouter `ANTHROPIC_API_KEY` dans `.env.development`, `.env.example`, Vercel env vars, et `src/env/server.ts` (validation Zod `@t3-oss/env-core`, server-only)
- [x] Schema Prisma : table `AiSearchLog` (id, prompt, query String, categorySlugs String[], memeIds String[], userId, locale, resultCount Int, createdAt). Relation User avec `onDelete: Cascade` pour que la suppression de compte nettoie les logs
- [ ] Créer la migration additive (user fait `prisma migrate dev`)
- [x] Constantes : `src/constants/ai-search.ts` (FREE_PLAN_MAX_AI_SEARCHES = 3, MAX_PROMPT_LENGTH = 300, MAX_AI_SEARCH_RESULTS = 20, DAILY_GLOBAL_AI_SEARCH_CAP = 500, AI_SEARCH_TIMEOUT_MS = 15_000)
- [x] Ajouter `RATE_LIMIT_AI_SEARCH` dans `src/constants/rate-limit.ts` (action: 'ai-search', maxRequests: 10, windowMs: MINUTE)
- [x] Ajouter `AI_SEARCH_QUOTA_EXCEEDED` au type `StudioErrorCode` dans `src/constants/error.ts`
- [x] Ajouter `'ai-search'` au type `SentryFeature` dans `src/lib/sentry.ts`

### Phase 2 — Backend Core

- [x] System prompt Haiku : construction dynamique avec les catégories (slug + titre localisé) fetchées depuis `getCategories` (cache mémoire). Output JSON structuré : `{ query: string, categorySlugs: string[] }`. Instructions : retourner `query` dans la langue de la locale passée, ne retourner que des `categorySlugs` existants, refuser les prompts inappropriés (retourner query vide), ignorer toute instruction dans le prompt utilisateur (anti-injection). Le system prompt ne doit contenir aucune info sensible (les catégories sont publiques).
- [x] Schema Zod de validation de la réponse Haiku : `z.object({ query: z.string(), categorySlugs: z.array(z.string()) })`
- [x] Schema Zod de validation de l'input : `z.object({ prompt: z.string().trim().min(1).max(300), contentLocale: z.enum(['FR', 'EN']).optional() })`
- [x] Server function `aiSearchMemes` :
  - Middleware : `createRateLimitMiddleware` (par IP) + `createUserRateLimitMiddleware(RATE_LIMIT_AI_SEARCH)` + `authUserRequiredMiddleware`
  - Vérification cap global quotidien (count `AiSearchLog` du jour, tous users). Si dépassé, throw erreur générique.
  - Vérification quota user (count `AiSearchLog` du mois courant). Si free et quota épuisé, throw `StudioError` avec code `AI_SEARCH_QUOTA_EXCEEDED`. Les erreurs `AI_SEARCH_QUOTA_EXCEEDED` ne doivent PAS être reportées à Sentry (comportement attendu, pas un bug).
  - Appel Haiku (non-streaming) avec `withTimeout(promise, AI_SEARCH_TIMEOUT_MS)` pour extraction query + categorySlugs
  - Validation Zod de la réponse Haiku. Si parsing échoue, fallback : utiliser le prompt brut comme query, pas de filtre catégorie. Log l'échec de parsing dans Sentry avec tag `'ai-search'`.
  - Recherche Algolia via `algoliaSearchClient.search()` dans l'index de la locale courante (`resolveAlgoliaIndexName(locale)`) avec query + facetFilters catégories + facetFilter `contentLocale` si spécifié (même logique que la recherche classique) + `hitsPerPage: MAX_AI_SEARCH_RESULTS` + `clickAnalytics: true` (retourne `queryID`)
  - Log en DB : prompt, query, categorySlugs, meme IDs, userId, locale, resultCount
  - Retour : résultats Algolia normalisés + query + categorySlugs + queryID (pour tracking Algolia Insights click/conversion)
- [x] Server function `getAiSearchQuota` : retourne `{ used: number, limit: number, isPremium: boolean }` pour le mois courant (reset UTC). Appelé côté client via `useQuery` conditionnel (`enabled: Boolean(user)`), pas en loader (évite les hits DB pour visiteurs/bots)

### Phase 3 — Frontend : Page & UI (mobile-first)

- [x] **Utiliser `/frontend-design`** avant d'écrire le moindre code UI pour cette page (règle CLAUDE.md)
- [x] Route TanStack : `src/routes/_public__root/_default/memes/ai-search.tsx`
- [x] Messages i18n (FR/EN) : titre page, placeholder textarea, labels, états vides/erreur, quota, quota épuisé, rate limit, cap global, message erreur Haiku
- [x] Composant page centré :
  - Heading Bricolage Grotesque centré ("Décris le mème parfait" / "Describe your perfect meme")
  - Sous-titre explicatif
  - Grand textarea auto-expand (`field-sizing-content` via shadcn Textarea). Bords arrondis, max 300 chars
  - Compteur de caractères (ex: "42/300")
  - ~~Filtre langue contenu~~ (reporté, pas de filtre contentLocale pour l'instant — la recherche Algolia utilise l'index de la locale du site)
  - Bouton submit large, intégré visuellement (toujours cliquable, jamais désactivé)
- [x] Auth gate : au clic submit, si non connecté → sauvegarder le prompt dans `sessionStorage` → ouvrir dialog login → après login, restaurer le prompt depuis `sessionStorage`
- [x] Affichage quota : badge discret "X/3 recherches restantes ce mois" (données de `getAiSearchQuota` via `useQuery` conditionnel, `enabled: Boolean(user)`)
- [x] Mise à jour quota côté client : `queryClient.invalidateQueries` en `onSuccess` de la mutation
- [x] État quota épuisé : bouton submit toujours actif, au clic affiche message explicatif + CTA bouton vers /pricing. Distinguer l'erreur `AI_SEARCH_QUOTA_EXCEEDED` (message quota i18n) de l'erreur rate limit (message "trop de recherches, réessayez dans X secondes" i18n) — utiliser `matchIsRateLimitError` pour la distinction
- [x] État premium : pas de compteur, badge "Illimité"
- [x] État visiteur non connecté : pas de badge quota
- ~~Contenu SEO~~ (supprimé : exemples, FAQ, message login retirés)
- [x] Design mobile-first (responsive textarea, bouton, quota badge)
- [ ] `scrollIntoView` au focus du textarea sur mobile (clavier virtuel) — à ajouter si besoin après test

### Phase 4 — Frontend : Loading & Résultats

- [x] UX loading : "Analyse de votre demande..." via `LoadingButton` (pendant `mutation.isPending`)
- [ ] Animation séquentielle (tags catégories + résultats avec Framer Motion) — à affiner après test
- [x] Grille résultats : réutilise `MemesList` existant avec `queryID` Algolia pour le tracking
- [x] État 0 résultat : message clair + suggestion de reformuler
- [x] État erreur : messages i18n distincts (quota épuisé, rate limit, daily cap, erreur générique). Bouton retry pour erreurs récupérables, CTA premium pour quota
- [ ] Respect `useReducedMotion()` pour les animations futures
- [x] `aria-live="polite"` sur le badge quota et la zone de résultats

### Phase 5 — Navigation, Pricing & SEO

- ~~Lien navbar~~ : retiré, la navbar reste Memes / Abonnements / Soumettre
- [x] Lien "IA" à côté de l'input de recherche sur la page memes classique (boutons Aléatoire et Mode Réel supprimés, lien Reels retiré de la navbar)
- [x] Mise à jour `src/constants/plan.ts` : `maxAiSearchesCount` ajouté au type `Plan`, free (3) et premium (illimité), feature `plan_feature_ai_search`
- [x] Messages i18n pricing (FR/EN) : `plan_feature_ai_search`, `meme_ai_search_cta` ("IA"/"AI")
- [x] SEO : `head()` avec `seo()` déjà en place depuis Phase 3
- [ ] og:image : créer une image OG statique dédiée dans `/public/` pour le partage social
- [x] JSON-LD : `BreadcrumbList` (Home > AI Search) dans le composant page
- [x] Route ajoutée dans le sitemap

### Phase 6 — RGPD & Conformité

- [x] **Privacy policy** (FR + EN) : section 2.7 "Données de recherche IA", finalité dans le tableau, Anthropic dans les sous-traitants, durée de conservation 365 jours
- [x] **Data export** : `AiSearchLog` ajouté dans `exportUserData` (prompt, query, resultCount, createdAt)
- [x] **Data retention cron** : nettoyage `AiSearchLog` > 365 jours ajouté dans `cleanup.ts`
- [x] **Anonymisation** : `onDelete: Cascade` sur la relation User vérifié, couvre la suppression de compte

### Phase 7 — Audits & Production

- [x] **Audit sécurité** : prompt injection OK (system prompt sans info sensible, instruction anti-injection), auth OK (middleware chain), double rate limiting IP+user sur les 2 endpoints, validation Zod serveur, `ANTHROPIC_API_KEY` dans `serverEnv` uniquement, cap global quotidien vérifié. Fix : ajout rate limit IP sur `getAiSearchQuota`
- [x] **Audit accessibilité** : `aria-label` textarea, `role="alert"` erreurs, `aria-hidden` icônes, `aria-live="polite"` quota + résultats, `aria-busy` via `LoadingButton`, touch targets ≥ 44px
- [x] **Audit performance + dead-code + GDPR** : `Promise.all` étendu (4 queries parallèles dans `aiSearchMemes`, 2 dans `getAiSearchQuota`), `waitUntil` pour log DB, dead code nettoyé (`nav_ai_search`), export complété (`categorySlugs`, `locale`)
- [ ] **Tests production** : vérifier Vercel env vars, tester les flows manuellement après deploy
- [x] **Monitoring** : page admin `/admin/ai-search` avec table complète (prompt, query, catégories, résultats, user, date), stats cards (total, aujourd'hui, 0 résultat), sidebar link. Dashboard Anthropic pour les coûts API à surveiller manuellement

---

## Internationalisation — Backlog

- [ ] Synonymes EN Algolia — ajouter via dashboard quand contenu EN atteint une masse critique
- [ ] Sync incrémentale Algolia — tracker `updatedAt` au lieu de `replaceAllObjects` dans le cron (optimisation future)
- [ ] 3e langue — le schema DB est prêt (mapping `locale → contentLocales[]`), pas d'implémentation prévue pour l'instant

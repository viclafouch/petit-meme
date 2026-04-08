# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Better Auth

**Type `UserWithRole` vs `InferUser` :** Bug interne où `UserWithRole.role` est `string | undefined` mais le type inféré retourne `string | null | undefined`. Fix appliqué : type `SessionUser` custom dans `src/lib/role.ts`.

- [ ] Ouvrir une issue upstream sur Better Auth pour aligner `UserWithRole.role` avec le type inféré

**Issues à surveiller :** [#2596](https://github.com/better-auth/better-auth/issues/2596), [#3033](https://github.com/better-auth/better-auth/issues/3033), [#7452](https://github.com/better-auth/better-auth/issues/7452)

---

## Algolia — Activer les modèles Recommend

- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend — nécessite 10 000 events (604 actuellement). Accélérer via upload CSV d'events passés depuis `MemeViewDaily`.
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent
- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

## OG Images — Takumi

Ajouter des OG images (Open Graph + Twitter Card) à toutes les pages publiques. Outil : **Takumi** (`@takumi-rs/image-response`), moteur de rendu d'images en Rust, gratuit, open source, compatible TanStack Start et Vercel.

### Documentation

Toujours consulter `https://takumi.kane.tw/llms-full.txt` avant de prendre une décision technique sur Takumi (API, config, fonts, formats, options de rendu). Ne pas deviner.

### Architecture

- Route API : `src/routes/api/og.ts` — endpoint GET, `ImageResponse` importé dynamiquement dans le handler (tree-shaking TanStack Start)
- Paramètres URL : `?type=category&title=Tendances&locale=fr`, etc.
- Template JSX réutilisable : un composant `OgTemplate` commun (logo, fond, titre, sous-titre) avec variantes par type de page
- Cache : header `Cache-Control: public, max-age=31536000, immutable` — Vercel CDN cache, zéro regénération
- Invalidation : constante `OG_VERSION` centralisée dans `buildOgImageUrl`, à incrémenter si le design change
- Dimensions : **1200x630** (standard OG/Twitter `summary_large_image`)
- Font : Bricolage Grotesque (font du site), fichier TTF embarqué dans le projet
- Modifications mineures de `seo()` nécessaires : ajouter `og:image:type` (nouveau param `imageType`), `og:image:secure_url` (duplique `og:image`), et rendre `og:description`/`twitter:description` conditionnels (bug existant : `content: undefined` quand `description` est omis)

### Pages concernées

**Pages dynamiques (OG via `/api/og`):**

| Page | Route | Params OG |
|---|---|---|
| Catégories (all, trending, popular, newest, DB cats) | `/memes/category/$slug` | `type=category&title={catTitle}&locale={locale}` |
| AI Search | `/memes/ai-search` | `type=ai-search&locale={locale}` |
| Pricing | `/pricing` | `type=pricing&locale={locale}` |
| Reels | `/reels` | `type=reels&locale={locale}` |
| Submit | `/submit` | `type=submit&locale={locale}` |
| Pages légales (`/privacy`, `/terms-of-use`, `/mentions-legales`, `/dmca`) | voir routes | `type=legal&title={pageTitle}&locale={locale}` |

**Page d'accueil :** images statiques par locale, fournies manuellement par l'utilisateur : `/public/images/og-home-fr.png` (FR) et `/public/images/og-home-en.png` (EN).

**Pages déjà couvertes :** `/memes/$memeId` et `/memes/$memeId/studio` (thumbnail Bunny CDN via `buildVideoImageUrl()`).

**Pages exclues (noindex ou redirects) :** `/favorites`, `/settings`, `/checkout.success`, `/password.reset`, `/password.create-new`, `/admin/*`, `/memes` (redirect 308), `/random` (redirect serveur).

### Phases

#### Phase 1 — Setup Takumi + endpoint + template de base

- [ ] Corriger `seo()` : ajouter `og:image:type` (param `imageType`), `og:image:secure_url`, et rendre `og:description`/`twitter:description` conditionnels quand `description` est absent
- [ ] Installer `@takumi-rs/image-response`
- [ ] Configurer Nitro `externals.traceInclude` dans `vite.config.ts` pour inclure les bindings natifs Takumi dans la serverless function Vercel
- [ ] Créer la route API `src/routes/api/og.ts` (GET handler, `ImageResponse` importé dynamiquement, `Cache-Control` immutable)
- [ ] Explorer les templates existants sur `https://takumi.kane.tw` et en choisir un adapté au style du site, puis l'adapter
- [ ] Créer le composant template OG (`src/components/og/og-template.tsx`) basé sur le template choisi
- [ ] Charger la font Bricolage Grotesque (fichier TTF embarqué)
- [ ] Valider que l'endpoint retourne un PNG correct en local

#### Phase 2 — Brancher toutes les pages

- [ ] Helper `buildOgImageUrl(params)` dans `src/lib/seo.ts` (constante `OG_VERSION` centralisée pour l'invalidation cache)
- [ ] Passer `image` + `imageAlt` à `seo()` sur chaque route listée dans le tableau ci-dessus
- [ ] Brancher la home (`/`) avec l'image statique par locale (`og-home-fr.png` / `og-home-en.png`, fournies par l'utilisateur)

#### Phase 3 — Validation

- [ ] Tester toutes les pages avec un validateur OG (opengraph.xyz, Twitter Card Validator)
- [ ] Vérifier le cache Vercel CDN (header `x-vercel-cache: HIT` après 2e requête)

## SEO — Items restants

- [ ] Surveiller le Video Indexing Report dans Search Console
- [ ] Stocker `width`/`height` dans le modèle `Video` (migration additive) — permet des `og:video:width/height` corrects par meme au lieu du 1280x720 hardcodé

## Admin — Items reportés

- [ ] RGPD : clear `last_active_at` à l'anonymisation (cron cleanup) + migrer la requête d'éligibilité vers `lastActiveAt`
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

## Dependency Updates — 2026-04-08

29 packages updated (lint + build OK). Audit plan : `.claude/plan-update-deps-2026-04-08.md`.

**Bloqué :** `stripe` 20.4.1 → 22.0.1 (peer dep `@better-auth/stripe` ne supporte que `^18||^19||^20`).
**Exclu :** TypeScript 6.

---

## Internationalisation — Backlog

- [ ] Synonymes EN Algolia — ajouter via dashboard quand contenu EN atteint une masse critique
- [ ] Sync incrémentale Algolia — tracker `updatedAt` au lieu de `replaceAllObjects` dans le cron (optimisation future)
- [ ] 3e langue — le schema DB est prêt (mapping `locale → contentLocales[]`), pas d'implémentation prévue pour l'instant

# Plan i18n — Interface du site (Phase 1)

**Contexte :** L'app est en production avec des utilisateurs et des données réelles. Toute migration Prisma doit être additive. Le site est actuellement French-only. L'objectif est de le rendre bilingue FR/EN (extensible).

**Lib :** Paraglide JS v2.13.1 (`@inlang/paraglide-js`). Compilé, 0 runtime, tree-shakeable, type-safe.

---

## Décisions d'architecture et justifications

**Pourquoi Paraglide JS (et pas next-intl, react-i18next, use-intl) :**
Paraglide compile les messages en fonctions JS au build. Zéro runtime i18n dans le bundle client. Tree-shaking automatique : seuls les messages utilisés sont inclus. Type-safe natif : chaque clé `m.xxx()` est typée, une clé manquante ou un paramètre oublié casse le build. Compatible Vite via plugin officiel. Le blog nikuscs.com et l'exemple TanStack Start officiel utilisent cette approche.

**Pourquoi `outputStructure: "message-modules"` :**
Chaque message est compilé dans son propre module JS. Le bundler (Vite/Rollup) tree-shake naturellement les messages non importés. Pas besoin de splitter manuellement les fichiers de traduction ni de créer des namespaces. Un seul `messages/fr.json` + `messages/en.json` suffit, les préfixes de clés (`nav_`, `auth_`, etc.) sont purement organisationnels.

**Pourquoi prefix URL sauf langue par défaut :**
FR (public cible principal) garde les URLs propres sans prefix. EN utilise `/en/`. Google indexe chaque version séparément via hreflang. Pas de redirect auto sur Accept-Language car Google crawle depuis les US (risque de ne jamais indexer le FR). À la place, banner suggestion côté client.

**Pourquoi pas de traduction de slugs :**
Complexité disproportionnée (mapping bidirectionnel, redirects, canonicals). Les slugs sont des identifiants techniques (IDs, catégories). Un seul jeu de slugs simplifie le routing et le SEO.

**Pourquoi `getLocale()` uniquement dans les composants et handlers serveur (JAMAIS dans les helpers/utils) :**
Un helper est une fonction pure. Il reçoit `locale` en paramètre, il ne va jamais le chercher lui-même. `getLocale()` est appelé au point d'entrée (composant React ou `.handler()` serveur) et passé en paramètre à travers la chaîne. Cela garantit la testabilité, la pureté et évite les dépendances implicites au contexte Paraglide.

**Pourquoi Better Auth i18n (et pas garder auth-errors.ts) :**
Plugin officiel `@better-auth/i18n` traduit les erreurs côté serveur avant qu'elles n'arrivent au client. Supprime le mapping manuel de ~27 codes dans `src/helpers/auth-errors.ts`. Détection locale via cookie (même cookie `PARAGLIDE_LOCALE` que Paraglide).

**Pourquoi feature branch unique :**
Un merge atomique garantit que le site passe de FR-only à bilingue en une fois. Les preview deploys Vercel permettent de tester `/en/` avant le merge.

---

## Configuration

**Stratégie d'URL :** prefix sauf langue par défaut. FR = `/pricing`. EN = `/en/pricing`. Pas de traduction de slugs.

**Détection locale :** URL > Cookie (`PARAGLIDE_LOCALE`) > Base locale (FR). Pas de redirect auto Accept-Language.

**Routes i18n :** toutes les routes publiques (home, pricing, memes, favorites, settings, legal, password, checkout, reels, random, studio).
**Routes exclues :** `/admin/*` (FR fixe), `/api/*`, `/sitemap.xml`, `/robots.txt`, `/health`.

**Libs à installer :** `@inlang/paraglide-js` (devDep v2.13.1), `@better-auth/i18n`

**Traduction :** Claude traduit tout (FR→EN) pendant l'extraction. Victor relit et ajuste. Pages légales : relecture pro juridique recommandée post-release.

---

## Ressources & Outils

**Références & documentation :**
- [TanStack Start + Paraglide example](https://github.com/TanStack/router/tree/main/examples/react/start-i18n-paraglide) — pattern de référence (vite.config, server.ts, router.tsx, messages/*.json)
- [nikuscs.com — TanStack Start i18n tutorial](https://nikuscs.com/blog/13-tanstackstart-i18n/) — walkthrough complet avec use-intl (patterns réutilisables pour la structure)
- [Paraglide JS docs](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) — config compiler, `outputStructure`, `strategy`, `urlPatterns`
- [Better Auth i18n plugin](https://www.better-auth.com/docs/plugins/i18n) — traduction erreurs auth côté serveur
- [Google Rich Results Test](https://search.google.com/test/rich-results) — validation JSON-LD post-deploy
- [Google Search Console](https://search.google.com/) — soumettre sitemap, vérifier hreflang, ciblage international

**MCP servers disponibles :**
- `context7` — fetcher la doc à jour de Paraglide JS, Better Auth, TanStack Start pendant l'implémentation (`resolve-library-id` → `query-docs`)
- `chrome-devtools` — tester le rendu EN, vérifier les cookies, inspecter le DOM (`<html lang>`, hreflang, og:locale) en live sur le preview deploy
- `Neon` — exécuter la migration Prisma `locale` via `run_sql` si besoin, vérifier le schema
- `shadcn` — rechercher des composants pour le language switcher (dropdown, popover)

**Skills Claude Code :**
- `/frontend-design` — design du language switcher et de la banner suggestion EN
- `/chrome-devtools` — debug et QA sur le preview deploy Vercel
- `/deep-dive` — approfondir chaque sous-étape avant implémentation
- `/simplify` — refactoring post-extraction des strings
- `code-refactoring` agent — obligatoire après chaque fichier modifié (post-task checklist)

**Template de fichiers Paraglide (pattern de référence) :**
- `project.inlang/settings.json` — `{ "baseLocale": "fr", "locales": ["fr", "en"] }`
- `messages/fr.json` / `messages/en.json` — clés préfixées par domaine (`nav_`, `auth_`, `pricing_`, etc.)
- `vite.config.ts` — `paraglideVitePlugin({ project: './project.inlang', outdir: './src/paraglide', outputStructure: 'message-modules', cookieName: 'PARAGLIDE_LOCALE', strategy: ['url', 'cookie', 'baseLocale'], urlPatterns: [...] })`
- `src/server.ts` — `paraglideMiddleware(req, () => handler.fetch(req))`
- `src/router.tsx` — `rewrite: { input: deLocalizeUrl, output: localizeUrl }`

**Outils de validation QA :**
- Vercel Preview Deploys — test automatique de la branche `feat/i18n`
- `pnpm run build` — vérifier que le build Vite+Nitro passe avec Paraglide
- `pnpm run lint` — vérifier types + ESLint après extraction
- View Source — vérifier hreflang, canonical, og:locale dans le HTML rendu
- Chrome DevTools Network — vérifier `Content-Language` header
- Lighthouse — audit SEO multilingue

---

## Stratégie de branches & release

**Branche de production** : `feat/migrate-to-vercel` (déployée sur Vercel). C'est la branche de référence, pas `main`.

**Phase 0** : quick wins directement sur `feat/migrate-to-vercel`.

**Feature branch** : `feat/i18n` tirée depuis `feat/migrate-to-vercel`. Tout le travail i18n Phase 1+ vit sur cette branche.

**Preview deploys** : Vercel déploie automatiquement la branche en preview → tester /en/ sur l'URL preview avant merge.

**Invariant** : le site FR doit fonctionner **identiquement** avant et après. Aucune régression FR.

**Merge final** : un seul merge de `feat/i18n` → `feat/migrate-to-vercel` quand tout est testé sur le preview deploy.

---

## Étapes (ordre optimisé par dépendances)

### Phase 0 — Quick wins (sur `feat/migrate-to-vercel`)

**0a. Bug fixes**
- [x] Fixer unicode escape `d\u2019` dans `src/constants/plan.ts:57` → double quotes pour garder l'apostrophe UTF-8
- [x] Fixer incohérence EN dans `src/components/error-component.tsx:55` ("View error details" → FR)
- [x] Fixer incohérence FR/EN dans `src/components/Meme/meme-reels.tsx` (aria-label "Pause"/"Play" → FR)

**0b. Prisma : locale user**
- [x] Ajouter champ `locale String @default("fr")` sur le modèle User (migration additive)
- [x] `pnpm exec dotenv -e .env.development -- pnpm exec prisma migrate dev --name add_user_locale` (Victor)
- [x] `pnpm exec prisma generate` après la migration
- [x] Note : le champ existe mais n'est pas encore utilisé → zéro impact sur le site

---

### Phase 1 — Feature branch `feat/i18n` (depuis `feat/migrate-to-vercel`)

**1. Infra Paraglide** (fondation — tout dépend de cette étape)
- [x] Installer `@inlang/paraglide-js` (devDep) — v2.13.1
- [x] Créer `project.inlang/settings.json` (baseLocale: `fr`, locales: `["fr", "en"]`)
- [x] Configurer `paraglideVitePlugin` dans `vite.config.ts` :
  - `strategy: ["url", "cookie", "baseLocale"]`
  - `outputStructure: "message-modules"`
  - `cookieName: "PARAGLIDE_LOCALE"`
  - `urlPatterns` — routes publiques localisées :
    `/`, `/memes`, `/memes/:memeId`, `/memes/category/:slug`, `/memes/:memeId/studio`,
    `/random`, `/favorites`, `/pricing`, `/settings`, `/checkout/success`,
    `/password/reset`, `/password/create-new`, `/terms-of-use`, `/privacy`,
    `/mentions-legales`, `/reels`
  - Routes **non** listées (donc exclues automatiquement) : `/admin/*`, `/api/*`, `/health`, `/sitemap.xml`, `/robots.txt`
  - `/en/admin`, `/en/api/*` etc. ne seront pas matchés → 404 naturel (pas de strip silencieux du prefix)
- [x] Ajouter `paraglideMiddleware` dans `src/server.ts`
- [x] Ajouter `rewrite` (`deLocalizeUrl`/`localizeUrl`) dans `src/router.tsx`
- [x] Migrer `src/i18n/config.ts` → remplacer par Paraglide runtime (`getLocale()`, `locales`, etc.). Seul fichier importateur : `src/helpers/number.ts`. **`src/i18n/config.ts` supprimé.**
- [x] Ajouter `src/paraglide/` au `.gitignore` (dossier généré, regénéré à chaque build)
- [x] Créer `messages/fr.json` et `messages/en.json` avec quelques clés de test
- [x] **Vérifier `getLocale()` dans les server functions** : appeler `getLocale()` dans un `.handler()` de `createServerFn` et confirmer qu'il retourne la bonne locale (le cookie `PARAGLIDE_LOCALE` doit être lu par le middleware Nitro). C'est critique pour `src/server/user.ts` (StudioError) et les toasts server-side. → **À tester manuellement avec le dev server.**
- [x] **Vérifier** : site FR identique, `/en/` affiche les clés EN, `/en/admin` retourne 404 → **À tester manuellement avec le dev server.**

**2. SEO multilingue** (dépend de 1 — `getLocale()` doit fonctionner)
Structure d'abord (indépendant des strings), contenu traduit complété après l'étape 3.
**Fichiers impactés :** `src/routes/__root.tsx`, `src/lib/seo.ts`, `src/routes/sitemap[.]xml.ts`
- [x] `<html lang={getLocale()}>` dynamique dans `src/routes/__root.tsx` (lignes 32, 71 — aussi `RootErrorDocument`)
- [x] `Content-Language` meta dynamique dans `src/routes/__root.tsx:239`
- [x] Enrichir `src/lib/seo.ts` — partie structurelle :
  - [x] `og:locale` dynamique (`fr_FR` / `en_US`) — via `OG_LOCALE_MAP`
  - [x] `og:locale:alternate` pour l'autre langue
  - [x] hreflang FR+EN bidirectionnels + `x-default` → FR
  - [x] Canonical localisé (prefix `/en/` pour les pages EN)
- [x] `buildUrl()` dans `src/lib/seo.ts` : paramètre `locale` optionnel ajouté, utilise `localizeUrl()` de Paraglide
- [x] Sitemap enrichi dans `src/routes/sitemap[.]xml.ts` : `<xhtml:link rel="alternate" hreflang="...">` pour chaque URL avec namespace `xmlns:xhtml`. Pages noindex déjà exclues du sitemap.
- [ ] Après étape 3 — compléter le contenu traduit dans `src/lib/seo.ts` :
  - [ ] `og:image:alt` traduit (thumbnails Bunny = images sans texte, pas de variante EN)
  - [ ] Title/description traduits via Paraglide dans `seo()`
  - [ ] Keywords SEO traduits par locale dans chaque `head()` de chaque route
  - [ ] JSON-LD traduits (`buildHomeJsonLd`, `buildMemeJsonLd`, `buildPricingJsonLd`, `buildCategoryJsonLd`, `buildBreadcrumbJsonLd`) :
    breadcrumbs, SearchAction URL, category descriptions, pricing labels, `@id` URIs avec locale

**3. Extraction strings** — ~250+ strings (dépend de 1 — `m.xxx()` doit fonctionner)
Découper en sous-batches commitables sur la feature branch. Chaque batch ajoute ses clés dans `messages/fr.json` et `messages/en.json` progressivement.
Préfixes de clés par domaine : `nav_`, `home_`, `pricing_`, `meme_`, `studio_`, `auth_`, `settings_`, `error_`, `common_`.
**Pluralisation** : remplacer le `pluralize()` custom de `src/helpers/format.ts` par la syntaxe ICU de Paraglide (`{count, plural, one {# vue} other {# vues}}`) dans les messages.
**Liens internes** : vérifier à chaque batch que tous les `<a href="/...">` sont remplacés par `<Link>` de TanStack Router (sinon le `localizeUrl()` est bypassé). Cas connu : `src/components/not-found.tsx:18`.

- [x] **Batch A — Navigation & layout** :
  `src/components/navbar.tsx`, `src/components/footer.tsx`, `src/components/user-dropdown.tsx`,
  `src/components/blocks/cookie-consent.tsx`, `src/components/mobile-nav.tsx`
  Aussi : fix `project.inlang/settings.json` (ajout `modules` + `plugin.inlang.messageFormat` pour que `paraglide-js compile` CLI fonctionne),
  fix `<a href="/privacy">` → `<Link to="/privacy">` dans cookie-consent, fix alt logo → "Memes by Lafouch", fix alt avatar → paramétré avec username

- [x] **Batch B — Pages principales** :
  `src/routes/_public__root/index.tsx`, `src/routes/_public__root/-components/hero.tsx`,
  `src/routes/_public__root/-components/best-memes.tsx`, `src/routes/_public__root/-components/faq.tsx`,
  `src/routes/_public__root/-components/responsive.tsx`,
  `src/components/faq-section.tsx` (heading rendu required, plus de défaut),
  `src/routes/_public__root/_default/pricing/index.tsx`,
  `src/routes/_public__root/_default/pricing/-components/pricing-card.tsx`,
  `src/routes/_public__root/_default/pricing/-components/billing-toggle.tsx`,
  `src/routes/_public__root/_default/pricing/-components/constants.ts` (FAQ, stats, garanties → fonctions getter),
  `src/routes/_public__root/_default/pricing/-components/guarantee-banner.tsx`,
  `src/routes/_public__root/_default/pricing/-components/stats-section.tsx`,
  `src/routes/_public__root/_default/pricing/-components/pricing-faq.tsx`,
  `src/constants/plan.ts` (FREE_PLAN/PREMIUM_PLAN → `getFreePlan()`/`getPremiumPlan()`, BILLING_PERIOD_LABELS → `getBillingPeriodLabel()`, constantes structurelles exportées séparément),
  `src/routes/_public__root/_default/checkout.success.tsx`
  Aussi mis à jour : `src/helpers/subscription.ts`, `src/server/user.ts`, `src/hooks/use-stripe-checkout.ts`, `src/routes/_public__root/_default/settings/-components/profile-content.tsx` (consommateurs de plan.ts)

- [ ] **Batch C — Memes & Studio** :
  `src/routes/_public__root/_default/memes/$memeId.tsx`,
  `src/routes/_public__root/_default/memes/category/$slug.tsx`,
  `src/routes/_public__root/_default/memes/-components/search-memes.tsx`,
  `src/components/Meme/Filters/memes-query.tsx` (placeholder recherche),
  `src/components/Meme/meme-list-item.tsx`, `src/components/Meme/player-dialog.tsx`,
  `src/components/Meme/video-overlay.tsx`, `src/components/Meme/meme-reels.tsx`,
  `src/components/Meme/Studio/studio-page.tsx`, `src/components/Meme/Studio/studio-controls.tsx`,
  `src/components/Meme/Studio/studio-actions.tsx`, `src/components/Meme/studio-fallbacks.tsx`,
  `src/constants/studio.ts` (STUDIO_FONT_SIZES, STUDIO_COLORS, STUDIO_TEMPLATES),
  `src/helpers/format.ts` (pluralize FR : vues/catégories)

- [ ] **Batch D — Auth & Settings** (inclut les callback URLs locale-aware) :
  **Callback URLs à rendre dynamiques** (sinon le user sur `/en/` atterrit sur `/` après auth) :
  `src/components/User/signup-form.tsx:82` (`callbackURL: '/'` → locale-aware),
  `src/components/User/auth-dialog.tsx` (`signIn.social` → passer `callbackURL` avec locale),
  `src/components/User/reset-password-form.tsx:40` (`redirectTo: '/password/create-new'` → locale-aware),
  `src/routes/api/cron/verification-reminder.ts:35` (`callbackURL='/'` → reste `/` car l'email est Phase 1.5).
  `src/components/User/login-form.tsx`, `src/components/User/signup-form.tsx`,
  `src/components/User/reset-password-form.tsx`, `src/components/User/create-new-password-form.tsx`,
  `src/components/User/update-password-dialog.tsx`, `src/components/User/delete-account-dialog.tsx`,
  `src/components/User/auth-dialog.tsx`,
  `src/routes/_public__root/_default/settings/index.tsx`,
  `src/routes/_public__root/_default/settings/-components/profile-header.tsx`,
  `src/routes/_public__root/_default/settings/-components/profile-content.tsx`,
  `src/routes/_public__root/_default/favorites.tsx`,
  `src/routes/_public__root/_default/password.reset.tsx`,
  `src/routes/_public__root/_default/password.create-new.tsx`

- [ ] **Batch E — Transversal** :
  `src/components/not-found.tsx`, `src/components/error-component.tsx`,
  `src/routes/__root.tsx` (messages erreur root),
  `src/lib/sentry.ts` (FEEDBACK_OPTIONS : ~12 labels widget feedback),
  `src/components/sentry-feedback-widget.tsx`,
  `src/server/user.ts` (StudioError messages),
  Toasts FR dans les hooks publics :
  `src/hooks/use-share-meme.ts`, `src/hooks/use-download-meme.ts`,
  `src/hooks/use-stripe-checkout.ts`, `src/hooks/use-sign-out.ts`,
  `src/hooks/use-toggle-bookmark.ts`, `src/hooks/use-video-processor.ts`

- [ ] **Batch F — Pages légales** :
  Créer `md/en/mentions-legales.md`, `md/en/privacy.md`, `md/en/terms-of-use.md`.
  Modifier le chargement dans `src/routes/_public__root/_default/mentions-legales.tsx`,
  `src/routes/_public__root/_default/privacy.tsx`, `src/routes/_public__root/_default/terms-of-use.tsx`
  pour charger le fichier selon `getLocale()`.

- [ ] Compléter étape 2 : title/description/keywords/JSON-LD/og:image:alt traduits (sous-section "Après étape 3")

**4. Intégrations tierces** (dépend de 1, parallélisable avec 3)
- [ ] **Better Auth i18n** : installer `@better-auth/i18n`, configurer le plugin dans `src/lib/auth.tsx` avec les traductions FR (reprendre les ~27 codes de `src/helpers/auth-errors.ts`), détection via cookie `PARAGLIDE_LOCALE`. Puis supprimer `src/helpers/auth-errors.ts` et ses imports dans `src/components/User/auth-dialog.tsx`.
- [ ] **Zod** : remplacer les messages custom FR dans les schémas par `m.validation_xxx()`.
  Fichiers : `src/components/User/signup-form.tsx`, `src/components/User/delete-account-dialog.tsx`, `src/components/User/update-password-dialog.tsx`
- [ ] **Date-fns & Intl** : passer la locale explicitement dans les appels publics. Admin reste FR fixe.
  Fichier public : `src/routes/_public__root/_default/settings/-components/profile-header.tsx` (`toLocaleDateString('fr-FR')` ligne 48)
  Fichiers admin (pas de changement) : `src/routes/admin/-components/dashboard/trends-chart.tsx`, `src/routes/admin/-components/dashboard/activity-feed.tsx`, `src/routes/admin/users/index.tsx`
- [ ] **Number formatting** : dans `src/helpers/number.ts`, remplacer `import { LOCALE_FALLBACK } from '@/i18n/config'` par `import { getLocale } from '@/paraglide/runtime'`
- [ ] **Stripe** : dans `src/hooks/use-stripe-checkout.ts`, remplacer `locale: 'fr'` par `locale: getLocale()` pour Checkout et Billing Portal

**5. UI i18n** (dépend de 1, parallélisable avec 3 et 4)
- [ ] Language switcher dans `src/components/navbar.tsx` : bouton compact FR/EN. Au clic : set cookie `PARAGLIDE_LOCALE` + naviguer vers l'URL localisée via `localizeUrl()`/`deLocalizeUrl()`. Design via `/frontend-design`.
- [ ] Banner suggestion EN : composant top discret dans `src/routes/__root.tsx` (ou layout public). Détecte `navigator.language` côté client, dismiss via cookie `LOCALE_BANNER_DISMISSED`. Affiché uniquement si locale courante = FR et Accept-Language contient `en`.
- [ ] Manifest dynamique : créer `src/routes/manifest[.]json.ts` (route serveur). Contenu localisé (`lang`, `description`, `categories`). Supprimer `public/manifest.json`. Mettre à jour le `<link rel="manifest">` dans `src/routes/__root.tsx`.
- [ ] Remplir `locale` sur le modèle User au signup ou au premier changement de langue (dans `src/lib/auth.tsx` pour le signup, dans le handler du language switcher pour le changement)

**6. QA & validation** (dépend de tout)
- [ ] `pnpm run build` — vérifier que le build passe
- [ ] Tester sur le preview deploy Vercel :
  - [ ] Navigation FR complète (toutes les pages, tous les flows)
  - [ ] Navigation EN complète (`/en/...`)
  - [ ] Switch FR ↔ EN (cookie persist, URLs correctes)
  - [ ] SEO : vérifier hreflang, og:locale, canonical, sitemap via view-source
  - [ ] JSON-LD : vérifier avec Google Rich Results Test
  - [ ] Auth flow EN : signup, login, reset password, social login
  - [ ] Studio flow EN
  - [ ] Share/download flow EN (URL copiée avec /en/ prefix)
  - [ ] Stripe checkout en EN (locale correcte)
  - [ ] Error pages EN (404, 500)
  - [ ] Cookie consent EN
  - [ ] Mobile responsive EN
- [ ] Merge `feat/i18n` → `feat/migrate-to-vercel`

**7. Tests manuels QA** (Victor — sur le preview deploy Vercel, avant merge)

Les mèmes restent en FR (phase 2). Seule l'interface est traduite. Les titres/descriptions de mèmes apparaîtront en FR même sur `/en/` — c'est attendu.

**A. Navigation de base**
- [ ] Ouvrir la home FR (`/`) → tout est en français, aucune régression visible
- [ ] Ouvrir la home EN (`/en/`) → toute l'interface est en anglais (hero, FAQ, footer, navbar)
- [ ] Vérifier que les titres de mèmes restent en FR sur `/en/` (contenu non traduit = attendu phase 2)
- [ ] Cliquer sur chaque lien de la navbar en FR → URLs sans prefix
- [ ] Cliquer sur chaque lien de la navbar en EN → URLs avec `/en/` prefix
- [ ] Vérifier le footer en FR et EN (liens, textes)

**B. Language switcher**
- [ ] Cliquer sur le switcher FR→EN depuis la home → redirigé vers `/en/`, cookie `PARAGLIDE_LOCALE` = `en`
- [ ] Cliquer sur le switcher EN→FR depuis `/en/` → redirigé vers `/`, cookie `PARAGLIDE_LOCALE` = `fr`
- [ ] Après switch EN→FR, naviguer sur d'autres pages → reste en FR (cookie persisté)
- [ ] Après switch FR→EN, fermer le navigateur, rouvrir → le site s'ouvre en EN (cookie persisté)
- [ ] Tester le switcher depuis une page profonde (`/en/memes/category/drole`) → arrive sur `/memes/category/drole`

**C. Banner suggestion**
- [ ] Ouvrir le site en FR avec un navigateur configuré en anglais → banner suggestion EN visible en haut
- [ ] Cliquer "dismiss" → banner disparaît, cookie `LOCALE_BANNER_DISMISSED` set
- [ ] Rafraîchir → banner ne réapparaît pas
- [ ] Ouvrir le site en FR avec un navigateur configuré en français → pas de banner

**D. URLs & redirections**
- [ ] Accéder à `/en/admin` → 404 (pas de version EN de l'admin)
- [ ] Accéder à `/en/api/auth/signin` → 404 (API non localisée)
- [ ] Accéder à `/en/health` → 404
- [ ] Accéder à une URL inexistante `/en/nimportequoi` → page 404 en anglais
- [ ] Accéder à une URL inexistante `/nimportequoi` → page 404 en français
- [ ] Accéder directement à `/en/pricing` (sans passer par le switcher) → page pricing en EN
- [ ] Utiliser le bouton "Back" du navigateur après un switch de langue → revient à la bonne langue

**E. Pages principales**
- [ ] Home EN : hero traduit, FAQ traduite (questions + réponses), stats traduits
- [ ] Pricing EN : plans traduits (Tester/Premium), features, FAQ pricing, garanties, toggle Mensuel/Annuel, prix en EUR
- [ ] Pricing EN : vérifier que les prix affichent bien `€` (pas `$` — on vend en EUR)
- [ ] Checkout success EN (`/en/checkout/success`) : message de félicitations en anglais
- [ ] Favoris EN (`/en/favorites`) : heading + description en anglais, empty state si pas de favoris

**F. Mèmes & Studio**
- [ ] Page mème detail EN (`/en/memes/{id}`) : boutons (Partager, Télécharger, Copier le lien, Aléatoire, Studio) en anglais. Titre du mème en FR (attendu).
- [ ] Copier le lien en EN → l'URL copiée contient `/en/memes/{id}`
- [ ] Partager en EN → toast "Loading..." (pas "Chargement...")
- [ ] Page catégorie EN (`/en/memes/category/{slug}`) : heading, description, recherche en anglais
- [ ] Search placeholder en EN
- [ ] Studio EN (`/en/memes/{id}/studio`) : contrôles (texte, position, police, taille, couleurs), templates, bouton générer, privacy notice — tout en anglais
- [ ] Studio : générer une vidéo → boutons partager/télécharger en anglais
- [ ] Studio : sans texte → toast erreur en anglais
- [ ] Reels EN (`/en/reels`) : boutons play/pause, mute/unmute, "Retour au site" en anglais
- [ ] Random EN (`/en/random`) → redirige vers un mème avec URL `/en/memes/{id}`

**G. Auth flows**
- [ ] Ouvrir login en EN → labels (Email, Password), placeholder (`john@example.com`), bouton "Sign in", lien "Forgot password?", divider "Or continue with"
- [ ] Ouvrir signup en EN → labels (Username, Email, Password, Confirm), placeholder (`John`, `john@example.com`), conditions en anglais, bouton "Create account"
- [ ] Tenter login avec mauvais mot de passe en EN → message d'erreur en anglais (via Better Auth i18n)
- [ ] Tenter signup avec email existant en EN → message d'erreur en anglais
- [ ] Reset password EN (`/en/password/reset`) → heading, bouton, success message en anglais
- [ ] Create new password EN (`/en/password/create-new`) → heading, labels, bouton en anglais
- [ ] Login via Twitter en EN → flow OAuth normal (Stripe/Twitter ne changent pas)

**H. Settings**
- [ ] Settings EN (`/en/settings`) : profil header (badge "Premium/Tester User", "Member since {date}"), carte compte, mot de passe, export données, zone danger — tout en anglais
- [ ] Vérifier que la date "Member since" utilise le format EN (`March 4, 2026` pas `4 mars 2026`)
- [ ] Cliquer "Change password" en EN → dialog en anglais
- [ ] Cliquer "Download my data" en EN → toast success en anglais
- [ ] Cliquer "Delete account" en EN → dialog warning en anglais, bouton confirmation en anglais
- [ ] Si abonné : "Manage subscription" en EN → Stripe Billing Portal s'ouvre dans la bonne locale

**I. Stripe**
- [ ] Cliquer "Upgrade to Premium" en EN → Stripe Checkout s'ouvre en anglais (pas en français)
- [ ] Vérifier que le retour après paiement arrive sur `/en/checkout/success`

**J. Pages légales**
- [ ] `/en/terms-of-use` → contenu en anglais complet
- [ ] `/en/privacy` → contenu en anglais complet
- [ ] `/en/mentions-legales` → contenu en anglais complet
- [ ] Vérifier que les liens dans le footer EN pointent vers `/en/terms-of-use`, `/en/privacy`, `/en/mentions-legales`

**K. Cookie consent**
- [ ] En EN : banner cookies en anglais, boutons Accept/Decline en anglais, lien "Learn more" en anglais
- [ ] Accepter → cookie consent set, banner disparaît
- [ ] Vérifier que le cookie consent est indépendant du cookie de langue

**L. Error pages**
- [ ] Page 404 EN : message en anglais, bouton "Return to website" en anglais
- [ ] Provoquer une erreur 500 (si possible sur preview) → error-component en anglais

**M. SEO (view-source)**
- [ ] Home FR : `<html lang="fr">`, `og:locale` = `fr_FR`, canonical = `https://memes-by-lafouch.fr/`, hreflang FR + EN + x-default
- [ ] Home EN : `<html lang="en">`, `og:locale` = `en_US`, `og:locale:alternate` = `fr_FR`, canonical = `https://memes-by-lafouch.fr/en/`, hreflang FR + EN + x-default
- [ ] Vérifier que les hreflang sont **bidirectionnels** (la page FR pointe vers EN, et la page EN pointe vers FR)
- [ ] Meme detail EN : vérifier `og:title`, `og:description` traduits, `og:image` présent (thumbnail Bunny)
- [ ] Pricing EN : vérifier JSON-LD (Google Rich Results Test)
- [ ] Sitemap (`/sitemap.xml`) : vérifier que chaque URL a un `<xhtml:link rel="alternate" hreflang="en">` et `<xhtml:link rel="alternate" hreflang="fr">`

**N. Mobile**
- [ ] Répéter les tests A, B, E, F, G sur mobile (responsive ou device réel)
- [ ] Vérifier que le language switcher est accessible sur mobile (pas caché dans un overflow)
- [ ] Vérifier que la banner suggestion ne bloque pas le contenu sur petit écran

**O. Sentry Feedback**
- [ ] En EN : cliquer le bouton Feedback → dialog en anglais (titre, labels, placeholders, boutons)
- [ ] Envoyer un feedback test → message de succès en anglais

**8. Post-déploiement** (actions manuelles — après merge)
- [ ] Google Search Console : soumettre le sitemap mis à jour (avec alternates hreflang)
- [ ] Google Search Console : vérifier Ciblage international (pas de restriction pays)
- [ ] Vérifier indexation des pages /en/* via URL Inspection
- [ ] Monitorer Sentry pour les erreurs post-deploy

---

## Hors scope phase 1

- Emails (11 templates) → Phase 1.5
- Algolia bilingue (queryLanguages, synonymes EN) → Phase 2
- Traduction des mèmes (titres, descriptions, catégories) → Phase 2
- Gemini AI prompt (génération descriptions) → Phase 2
- Admin panel → FR fixe

### Phase 1.5 — Emails i18n

- [ ] Traduire les 11 templates React-Email en EN
- [ ] Traduire les sujets d'emails dans Better Auth config (`src/lib/auth.tsx`) : 6 sujets FR
- [ ] Traduire les sujets d'emails custom hors Better Auth : cron verification-reminder, user-cleanup
- [ ] Envoyer les emails dans la langue du user (champ `locale` en DB)
- [ ] AI errors admin (`src/server/ai.ts`) : optionnel, admin-only

### Phase 2 — Contenu (mèmes) + Algolia bilingue

- [ ] Stratégie de traduction des mèmes (champ `lang` par mème, titres/descriptions traduits)
- [ ] Algolia : `queryLanguages: ["fr", "en"]`, synonymes EN, `removeStopWords` bilingue
- [ ] Ciblage de langue par mème (certains mèmes FR-only, certains EN-only, certains universels)

---

## Audits finaux (après QA, avant merge final)

Tous les audits doivent passer **avant** le merge de `feat/i18n` → `feat/migrate-to-vercel`.

### Audits agents Claude Code

- [ ] **`dead-code`** — Vérifier suppression complète de : `src/i18n/config.ts`, `src/helpers/auth-errors.ts`, `public/manifest.json`. Détecter imports orphelins, exports inutilisés, fichiers morts post-migration.
- [ ] **`security-auditor`** — Cookie `PARAGLIDE_LOCALE` (pas de données sensibles, HttpOnly non requis car lu côté client, SameSite=Lax). Pas d'injection via les clés i18n (Paraglide compile au build, pas de `dangerouslySetInnerHTML`). Vérifier que les pages légales EN ne sont pas injectables. Vérifier que `buildUrl()` avec le paramètre `locale` n'ouvre pas de redirect open.
- [ ] **`react-performance`** — Vérifier que le changement de locale ne cause pas de re-renders en cascade. Paraglide est compilé (pas de Context provider), mais le language switcher déclenche une navigation complète → vérifier que c'est bien un full page navigation et pas un re-render client lourd.
- [ ] **`tailwind-audit`** — Vérifier que les strings EN plus longues/courtes ne cassent pas les layouts (boutons, badges, cards). Attention aux textes pricing, hero, FAQ.
- [ ] **`backend-performance`** — Overhead du `paraglideMiddleware` dans `src/server.ts` (doit être négligeable, juste un cookie read + URL parse). Vérifier pas de régression sur les temps de réponse.
- [ ] **`gdpr-auditor`** — Cookie `PARAGLIDE_LOCALE` = préférence fonctionnelle (pas de consentement requis, exempt ePrivacy). Cookie `LOCALE_BANNER_DISMISSED` = même catégorie. Vérifier que le cookie consent EN fonctionne et que les pages privacy/terms EN sont complètes.
- [ ] **`code-refactoring`** — Passe finale sur tous les fichiers modifiés (obligatoire par le post-task checklist, mais refaire une passe globale à la fin).

### Audits web manuels

- [ ] **Lighthouse SEO** — Score SEO sur la home FR et `/en/` (objectif : 100/100 sur les deux). Vérifier que hreflang, canonical, og:locale sont détectés.
- [ ] **Google Rich Results Test** — Tester JSON-LD sur : home FR, home EN, meme detail FR, meme detail EN, pricing FR, pricing EN. Vérifier que les breadcrumbs, SearchAction, pricing data sont valides.
- [ ] **PageSpeed Insights** — Comparer les scores avant/après i18n (mobile + desktop). Paraglide ne devrait pas impacter le bundle size (tree-shaking), mais vérifier.
- [ ] **hreflang validator** — Utiliser un outil en ligne (ex: [hreflang.org](https://www.hreflang.org/)) pour valider la cohérence bidirectionnelle FR↔EN sur quelques URLs clés.
- [ ] **Sitemap validator** — Vérifier que le sitemap contient bien les `<xhtml:link rel="alternate">` pour chaque URL, et que les URLs sont accessibles (pas de 404).

### Actions manuelles par service externe

| Service | Action requise | Détail |
|---------|---------------|--------|
| **Google Search Console** | **OUI** | Soumettre sitemap mis à jour, vérifier Ciblage international (pas de restriction pays), URL Inspection sur /en/* |
| **Vercel** | **NON** | Preview deploys automatiques. Aucune config i18n spécifique sur Hobby plan. |
| **Stripe** | **NON** | La locale est passée dynamiquement dans le code. Aucune config dashboard Stripe. |
| **Algolia** | **NON (phase 1)** | Pas de changement. `queryLanguages`, synonymes EN, `removeStopWords` reportés en phase 2. |
| **Sentry** | **NON** | Les labels du Feedback Widget sont traduits dans le code. Monitorer les erreurs post-deploy (déjà en étape 7). |
| **Bunny CDN** | **NON** | Les vidéos/thumbnails sont language-agnostic. Aucune action. |
| **Neon (Postgres)** | **NON** | La migration Prisma `locale` est appliquée via le code. Aucune action manuelle sur le dashboard Neon. |
| **Resend** | **NON (phase 1)** | Emails reportés en phase 1.5. Aucune action. |
| **Better Auth** | **NON** | Config du plugin `@better-auth/i18n` est dans le code. Aucune action dashboard. |
| **Inlang (Paraglide)** | **NON** | Tout est en local (`project.inlang/`, `messages/*.json`). Pas de service cloud à configurer. |

### Suppression du plan

- [ ] Après release en production, QA validée, audits passés, Google Search Console vérifié, 1 semaine de monitoring Sentry sans régression :
  **Supprimer `.claude/plan-i18n.md`** et mettre à jour le renvoi dans `.claude/plan.md` → remplacer par une ligne "Internationalisation FR/EN : ✅ Terminé (phase 1)".

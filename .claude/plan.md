# Plan — Correction des audits

Les détails complets (fichiers, lignes, code) sont dans `audits/<nom>.md`.

**Workflow par étape :**
1. Lire les audits référencés
2. Appliquer les corrections
3. `npm run lint:fix`
4. Lancer l'agent `code-refactoring` si code significatif modifié
5. Cocher `[x]` les items terminés

---

## Étape 1 — Fondations

> Audits : [`dependency-updates.md`](../audits/dependency-updates.md), [`dead-code.md`](../audits/dead-code.md)

ESLint v5 d'abord pour que tout le code modifié ensuite soit lint correctement. Dead code ensuite pour réduire le bruit. Deps routine pour partir sur une base à jour.

### ESLint v5

- [x] `npm install -D prettier@3 @viclafouch/eslint-config-viclafouch@5`
- [x] Réécrire `eslint.config.js` : retirer `baseConfig`, ajouter `hooksConfig` + `jsxA11yConfig`, corriger l'ordre (ignores → typescript → react → hooks → a11y → imports → prettier)
- [x] `npm run lint:fix` et corriger les nouvelles erreurs

### Dead code

- [x] Supprimer les 11 fichiers inutilisés
- [x] Retirer `export` des 8 symboles utilisés uniquement localement
- [x] Supprimer les 2 fonctions mortes (`matchIsVideoFullyReady`, `useCloseDialog`)
- [x] Corriger le bug dans `merge-ref.ts` (`=== 0` → `=== 1`)
- [x] `npm uninstall` les 4 packages inutilisés
- [x] Remplacer `algoliasearch` par `@algolia/client-search` explicite

### Deps routine

- [x] Appliquer les 16 patches routine
- [x] Mettre à jour TanStack Router ecosystem, Prisma 7.3.0, @google/genai, resend, react-email, TanStack Form, motion 12.34.0, nitro alpha.2
- [x] `npx prisma generate` + `npm run build` pour valider

---

## Étape 2 — Sécurité

> Audits : [`security.md`](../audits/security.md), [`best-practices.md`](../audits/best-practices.md) §5 §8

Vulnérabilités actives. L'injection SQL est exploitable en production. On fixe tout ce qui est sécurité ici, y compris les items auth et headers issus des best-practices.

### CRITICAL

- [x] Injection SQL dans `reels.ts` — `$queryRawUnsafe` → `$queryRaw` avec tagged template
- [x] `minPasswordLength` serveur 4 → 12

### HIGH

- [ ] ~~Authentification webhook Bunny~~ (pas de support natif Bunny, skippé)
- [x] Middleware admin manquant sur `getListUsers`
- [x] Rate limiting sur auth (Better Auth built-in, custom skippé)
- [x] Security headers via Nitro routeRules (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- [x] Vérifier pattern middleware composable (auth → admin chainé, `setResponseStatus` avant throw)
- [x] `beforeLoad` sur toutes les routes protégées (pas de check dans le composant)

### MEDIUM

- [x] Flag `secure` sur le cookie `anonId`
- [x] Injection de filtres Algolia (quoter la valeur `category`)
- [x] Authentification `getVideoPlayData` (vérifier que la vidéo est publiée)
- [x] CSRF : valider le header `Origin` sur les requêtes state-changing
- [x] Séparer env vars client/server dans des fichiers distincts + validations `.startsWith()`

### LOW

- [x] Algolia App ID en env var
- [x] Conditionner messages d'erreur détaillés au `NODE_ENV`
- [x] `VITE_BUNNY_LIBRARY_ID` → server-only si possible

---

## Étape 3 — Caching + Infrastructure

> Audit : [`best-practices.md`](../audits/best-practices.md) §1 §8

Les quick wins les plus impactants du projet. Configurer le caching transforme l'expérience utilisateur et pose les fondations pour le SEO.

- [x] Configurer QueryClient defaults : `staleTime: 30s`, `gcTime: 5min`, `refetchOnWindowFocus` prod only, `retry: false`
- [x] Configurer router options : `defaultPreload: 'intent'`, `defaultPreloadDelay: 50`, `defaultPreloadStaleTime: 30_000`, `defaultPendingMs: 1000`, `defaultPendingMinMs: 200`, `scrollRestoration: true`
- [x] Ajouter `routeRules` Nitro : cache immutable pour `/images/**` et `/fonts/**`
- [x] Activer `cookieCache` dans Better Auth (`maxAge: 5 * 60`)
- [x] Ajouter `staleTime` aux query options fréquentes (`queries.ts`)
- [x] Configurer locale FR pour Zod : `z.config(fr())`

---

## Étape 4 — Backend Performance

> Audits : [`backend-performance.md`](../audits/backend-performance.md), [`best-practices.md`](../audits/best-practices.md) §6 §7

Corriger les problèmes de perf serveur maintenant que l'infra caching est en place.

### CRITICAL

- [x] `getRandomMeme` — remplacer `findMany` par count + skip random

### HIGH

- [x] Refactorer `getActiveSubscription` pour accepter userId en paramètre (`findActiveSubscription` via `createServerOnlyFn`)
- [x] Paralléliser les requêtes séquentielles dans `deleteMeme`, `createMemeFromTwitterUrl`, `createMemeFromFile`
- [x] Proxy vidéo — streamer `response.body` au lieu de buffer en mémoire
- [x] Utiliser `ensureQueryData` au lieu de `fetchQuery` dans les loaders
- [x] `staleTime: 5 * MINUTE` sur les query options fréquentes

### MEDIUM

- [x] Ajouter les index Prisma manquants (`@@index([status])`, `@@index([status, viewCount])`)
- [x] Valider les inputs de toutes les server functions avec Zod + spécifier `method` (déjà fait)
- [x] Optimiser les cron jobs (batch 500, cursor-based pagination, concurrence contrôlée)

### LOW

- [ ] Réduire la taille des payloads API

### Error Handling (audit complémentaire)

> Audit : [`error-handling.md`](../audits/error-handling.md)

- [x] Créer `src/helpers/auth-errors.ts` avec map exhaustive `authClient.$ERROR_CODES` → messages FR
- [x] Supprimer `getErrorMessage` / `ERROR_CODES` de `auth-client.ts`
- [x] Migrer `auth-dialog.tsx` (LoginForm + SignupForm) → pattern `throw new Error(error.code)` + JSX
- [x] Migrer `update-password-dialog.tsx` → pattern cible
- [x] Migrer `delete-account-dialog.tsx` → pattern cible
- [x] Migrer `create-new-password-form.tsx` → `useMutation` + pattern cible
- [x] Séparer erreurs auth / erreurs app dans `use-video-processor.ts`

### Memory Leaks (audit complémentaire)

- [x] Object URL leak dans `downloadBlob` — ajouté `URL.revokeObjectURL`
- [x] FFmpeg virtual filesystem jamais nettoyé — ajouté `deleteFile` après traitement
- [x] FFmpeg terminate appelé deux fois — `onSettled` = `ffmpeg.off('progress')`, terminate dans cleanup uniquement
- [x] Object URL leak dans `useVideoProcessor` — `objectUrlRef` pour tracker et révoquer
- [x] Prisma connection pool non configuré — `PrismaPg` avec `max: 20`, timeouts

---

## Étape 5 — SEO

> Audit : [`best-practices.md`](../audits/best-practices.md) §2

Profite des headers et du caching déjà en place (étapes 2-3).

- [x] Compléter les meta tags root : `viewport-fit=cover`, `color-scheme`, `application-name`, `apple-mobile-web-app-*`, `theme-color`
- [x] Vérifier le helper `seo()` : og:image dimensions, og:locale, twitter:image:alt, canonical, alternate hrefLang
- [x] Ajouter `noai,noimageai` double protection (meta + httpEquiv)
- [x] Créer les schemas JSON-LD : `WebSite` global avec `SearchAction`, `VideoObject` par meme, `BreadcrumbList`
- [x] Utiliser `schema-dts` + `as const satisfies WithContext<Type>`
- [x] Créer la route `sitemap[.]xml.ts` dynamique (pages publiques + memes)
- [x] Créer/compléter `robots.txt` avec `Disallow: /admin/`, `/api/` + lien sitemap
- [x] Créer le `manifest.webmanifest` complet + vérifier favicons
- [x] `staleTime: Infinity` sur les routes statiques (CGU, mentions légales)
- [x] `preload: 'viewport'` sur les liens de navigation critiques
- [x] `head()` avec SEO complet sur chaque route publique + `noindex,nofollow` sur les 404
- [x] Titres `<title>` sur toutes les routes admin (Librairie, Catégories, Utilisateurs, Téléchargeur, $memeId)

---

## Étape 6 — GDPR

> Audit : [`gdpr.md`](../audits/gdpr.md)

Conformité légale. Les CRITICAL sont des obligations réglementaires.

### CRITICAL

- [ ] Implémenter un bandeau de consentement cookies (bloquer Mixpanel et `anonId` sans consentement)
- [ ] Gater Mixpanel derrière le consentement, retirer `ignore_dnt: true`, stopper l'envoi de PII
- [ ] Créer la page politique de confidentialité (`/privacy`)

### HIGH

- [ ] Créer la page mentions légales (`/mentions-legales`)
- [ ] Ajouter checkbox CGU + lien privacy au formulaire d'inscription
- [ ] Implémenter l'export de données utilisateur (JSON)
- [ ] Définir et implémenter les durées de rétention + cron de nettoyage

### MEDIUM

- [ ] Ajouter l'édition de profil (nom, email)
- [ ] Compléter le flux de suppression (Mixpanel, Stripe)
- [ ] Conditionner les `console.log` de PII à `NODE_ENV`

### LOW

- [ ] Auto-héberger Google Fonts

---

## Étape 7 — Code Quality

> Audits : [`duplicate-code.md`](../audits/duplicate-code.md), [`code-refactoring.md`](../audits/code-refactoring.md), [`tailwind.md`](../audits/tailwind.md)

Dédupliquer d'abord, refactorer ensuite, Tailwind en dernier (mécanique). Tout le code ajouté aux étapes précédentes bénéficie de ce nettoyage.

### Duplicate code

- [ ] Extraire `useToggleBookmark` hook (~50 lignes)
- [ ] Extraire `useKeywordsField` hook + composant `KeywordsField` (~70 lignes)
- [ ] Extraire `createMemeWithVideo` server function (~40 lignes)
- [ ] Extraire `MEME_FULL_INCLUDE` constante Prisma (5 répétitions)
- [ ] Extraire `DEFAULT_MEME_TITLE` et `NEWS_CATEGORY_SLUG` constantes
- [ ] Extraire `FormFooter`, `MemeVideoThumbnail` composants
- [ ] Extraire `safeAlgoliaOp` wrapper + `searchMemesFromAlgolia` helper

### Code refactoring

- [ ] Fix bug : erreur avalée dans `utils.ts` (catch qui perd le message détaillé)
- [ ] Extraire le ternaire imbriqué dans `studio-dialog.tsx`
- [ ] Découper les composants > 200 lignes (MemeForm, $memeId, SignupForm, PlayerDialog)
- [x] `getTresholdMs` → objet params (typo rename `getThresholdMs` restante)

- [ ] Mutations `let` → fonctions pures
- [ ] `as const satisfies` sur `BUNNY_STATUS`, FAQ items
- [ ] Renommer `open` → `isOpen` dans mobile-nav et user-dropdown
- [ ] Supprimer commentaires inutiles + code commenté mort
- [ ] `return () => {}` → `return`
- [x] `@ts-ignore` → `@ts-expect-error` avec explication

### Tailwind

- [ ] Bulk replace `w-full h-full` → `size-full` (~20 emplacements)
- [ ] `w-N h-N` → `size-N` sur les icônes
- [ ] Couleurs hardcodées gray/zinc/stone → tokens thème
- [ ] Résoudre le conflit `h-7 w-7` + `size-6` dans twitter-form
- [ ] `hover:scale-*` → transitions d'opacité
- [ ] Shorthands restants (`px-6 py-6` → `p-6`, `right-0 left-0` → `inset-x-0`)
- [ ] Classes mortes/redondantes
- [ ] `mt-*`/`space-y-*` → `gap`

---

## Étape 8 — React Performance

> Audit : [`react-performance.md`](../audits/react-performance.md)

Après le refactoring (étape 7) pour ne pas optimiser du code qui va changer.

- [ ] HIGH : `createRef` dans `useMemo` pour Reels → Map persistante de refs
- [x] MEDIUM : dépendances inutiles dans les `useMemo` (`user` dans meme-list-item et toggle-like-button)
- [ ] MEDIUM : guard SSR pour `IntersectionObserver` (initialiser dans useEffect, pas useRef)
- [x] MEDIUM : cleanup FFmpeg dans `useVideoProcessor` (ajouter `query.data` / `ffmpeg` aux deps)
- [ ] MEDIUM : optimiser `DialogProvider` → selectors Zustand
- [ ] MEDIUM : `virtualItems` comme dépendance de useEffect → dériver une dépendance stable
- [ ] LOW : stabiliser les callbacks passés aux composants memo (`handleSelect`, `handleUnSelect`)

---

## Étape 9 — Images + Accessibilité + DX

> Audit : [`best-practices.md`](../audits/best-practices.md) §3 §10 §11 §12 §13

Items de polish qui améliorent la qualité globale sans urgence.

### Images

- [ ] Créer un composant image optimisé (srcSet, sizes, width/height, loading, fetchPriority, decoding)
- [ ] `<picture>` avec source WebP + fallback pour les images critiques
- [ ] Precharger les images hero dans `head()` + priority aux 4 premiers memes visibles
- [ ] S'assurer que Bunny CDN sert en WebP + générer OG images PNG 1200x630

### Accessibilité

- [ ] Skip-to-content link + `<main id="main-content">`
- [ ] Semantic HTML (headings h1→h2→h3, nav, article, section)
- [ ] `prefers-reduced-motion` dans les animations Motion
- [ ] `aria-label` sur boutons sans texte, `aria-hidden` sur icônes, `aria-live` sur messages dynamiques

### DX

- [ ] `placeholderData: keepPreviousData` sur les queries avec filtres/pagination
- [ ] `useSyncExternalStore` pour les hooks media query (SSR-safe)
- [ ] Husky pre-commit `npm run lint`
- [ ] Scripts `deps` / `deps:major` avec taze dans package.json
- [ ] `.npmrc` strict (`engine-strict`, `legacy-peer-deps=false`, `package-lock=true`)

### Fonts

- [ ] `font-display: swap` + precharger les fonts critiques (woff2)

---

## Étape 10 — Breaking Dependencies

> Audit : [`dependency-updates.md`](../audits/dependency-updates.md) — Phases 3 à 5

En dernier car nécessite une codebase stable et testée. Chaque update peut casser des choses.

- [ ] Consolider `motion`/`framer-motion` → `motion` uniquement (remplacer tous les imports `framer-motion` → `motion/react`)
- [ ] Mettre à jour `better-auth` 1.3.12 → 1.4.18 (JWE cookies → tous les utilisateurs déconnectés, tester tout le flow auth)
- [ ] Mettre à jour `stripe` 18.5.0 → 19.3.1 (compatible better-auth/stripe, vérifier `discount.coupon` → `discount.source.coupon`)
- [ ] Évaluer `stripe` 19.x → 20.x (breaking changes limités si pas d'API V2)

---

## Futur

Items non planifiés, à traiter après les audits.

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.).

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles documentées dans `best-practices.md` §9. Préparer la migration une fois la codebase stabilisée.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern documenté dans `best-practices.md` §4. Dépend de la mise à jour Stripe 20.x (étape 10).

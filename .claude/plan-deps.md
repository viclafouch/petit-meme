# Plan — Mise a jour des dependances

> Fichier temporaire. A supprimer une fois toutes les cases cochees.

---

## Legende

- `[x]` = mis a jour
- `[ ] BREAKING` = contient des breaking changes, attention requise
- Difficulte : Trivial / Facile / Moyen / Difficile / Bloque

---

## 1. Mises a jour triviales (patch, aucun changement notable)

### Algolia (5.49.0 -> 5.49.1)

Patch de maintenance, corrections mineures internes.

- [ ] `@algolia/client-insights` 5.49.0 -> 5.49.1
- [ ] `@algolia/client-search` 5.49.0 -> 5.49.1
- [ ] `@algolia/recommend` 5.49.0 -> 5.49.1

**Difficulte : Trivial** — `pnpm update @algolia/client-insights @algolia/client-search @algolia/recommend`

---

### @tanstack/react-virtual (3.13.18 -> 3.13.19)

Patch, corrections mineures.

- [ ] `@tanstack/react-virtual` 3.13.18 -> 3.13.19

**Difficulte : Trivial**

---

### @ffmpeg/core (0.12.9 -> 0.12.10)

Patch de maintenance.

- [ ] `@ffmpeg/core` 0.12.9 -> 0.12.10

**Difficulte : Trivial** — Version pinnee sans `^`, modifier manuellement dans package.json.

---

### @types/node (25.3.0 -> 25.3.1)

Patch sur les types Node.js.

- [ ] `@types/node` 25.3.0 -> 25.3.1

**Difficulte : Trivial**

---

## 2. Mises a jour mineures (nouvelles features, pas de breaking change)

### Tailwind CSS (4.2.0 -> 4.2.1)

Patch avec bugfixes. 4.2.0 avait introduit :
- Nouvelles palettes de couleurs : `mauve`, `olive`, `mist`, `taupe`
- Utilitaires logiques block/inline : `pbs-*`, `pbe-*`, `mbs-*`, `mbe-*`, `inline-*`, `block-*`
- `font-features-*` pour `font-feature-settings`
- Deprecation de `start-*`/`end-*` (inset) en faveur de `inset-s-*`/`inset-e-*` (le projet n'utilise pas ces utilitaires)

4.2.1 corrige :
- Trailing dash dans les noms d'utilitaires fonctionnels
- Detection de classes avec `.` dans les fichiers MDX

- [ ] `tailwindcss` 4.2.0 -> 4.2.1
- [ ] `@tailwindcss/vite` 4.2.0 -> 4.2.1

**Difficulte : Trivial**

---

### Better Auth (1.4.18 -> 1.4.19)

Patch avec corrections importantes :
- **Fix Stripe** : utilisation du bon `stripeCustomerId` sur `/subscription/cancel/callback` — corrige un bug potentiel d'annulation
- **Fix deadlock** : `getCurrentAdapter` pour eviter les deadlocks en concurrence
- **Fix admin** : type `listUsers` passe de `never[]` a `UserWithRole[]` (peut surfacer des erreurs TS)
- **Fix OAuth** : matching email case-insensitive pour le linking social
- **Fix email** : skip verification email pour les users deja verifies sans session
- Nouvelles features OAuth provider (RFC 9207, rate limiting, HTTPS enforcement)

- [ ] `better-auth` 1.4.18 -> 1.4.19
- [ ] `@better-auth/stripe` 1.4.18 -> 1.4.19

**Difficulte : Facile** — Lancer lint apres update pour verifier le type `listUsers`. Tester le flow d'annulation Stripe.

---

### Stripe SDK (20.3.1 -> 20.4.0)

Minor avec nouvelles ressources API :
- Nouveaux types : `Reserve.Hold`, `Reserve.Plan`, `Reserve.Release`
- `pay_by_bank` pour invoices/subscriptions
- Nouveaux device types Terminal (`stripe_s710`)
- Changements de types mineurs : `Boleto.tax_id` devient nullable, `us_bank_account.expected_debit_date` devient non-nullable
- Nouvelle API version pinnee `2026-02-25.clover`

- [ ] `stripe` 20.3.1 -> 20.4.0

**Difficulte : Facile** — Verifier que `pnpm run lint` passe (types legerement modifies).

---

### TanStack Router / Start (1.161.1 -> 1.163.2)

18 releases avec beaucoup de bugfixes importants :
- **Fix SSR hydration** : decodage correct des match IDs avec `/`
- **Fix preload `intent`** : debounce correct, plus de preloads agressifs (directement pertinent pour la navbar)
- **Fix `stringifyParams`** : erreurs catch + rendu de `errorComponent` au lieu de crash
- 5 rounds de fix sur l'import-protection plugin (moins de faux positifs)
- `getRouterContext` retire de l'API publique (pas utilise dans le projet)
- Nouvelle option `preloadDelay` sur `<Link>`
- Nouvelle option `excludeFiles` pour import-protection

- [ ] `@tanstack/react-router` 1.161.1 -> 1.163.2
- [ ] `@tanstack/react-router-ssr-query` 1.161.1 -> 1.163.2
- [ ] `@tanstack/react-start` 1.161.1 -> 1.163.2

**Difficulte : Trivial** — Drop-in, versions pinnees sans `^`, modifier manuellement dans package.json. Faire un build pour verifier.

---

### @tanstack/react-pacer (0.19.4 -> 0.20.0)

Nouvelle feature additive :
- `onUnmount` callback sur tous les hooks (debouncer, throttler, batcher, queuer) — permet de `flush()` au lieu de `cancel()` au demontage

Le projet utilise `useDebouncer` et `useDebouncedValue` dans 3 fichiers. Aucun changement de code requis.

- [ ] `@tanstack/react-pacer` ^0.19.4 -> ^0.20.0

**Difficulte : Trivial** — Modifier la range dans package.json car `^0.19.4` ne resout pas `0.20.0` (semver pre-1.0).

---

### Lucide React (0.563.0 -> 0.575.0)

~20 nouvelles icones, quelques redesigns cosmetiques :
- **Rename** : `flip-horizontal` -> `square-centerline-dashed-horizontal`, `flip-vertical` -> `square-centerline-dashed-vertical` (pas utilise dans le projet)
- **Fix ESM** : correction du chemin de sortie ESM (important pour les bundlers)
- **Fix** : `clapperboard` slash protrusion (le projet utilise cette icone)
- Nouvelles icones notables : `database-search`, `user-key`, `globe-off`, `git-merge-conflict`, `message-square-check`

- [ ] `lucide-react` 0.563.0 -> 0.575.0

**Difficulte : Trivial** — Aucune icone renommee n'est utilisee dans le projet.

---

### @google/genai (1.42.0 -> 1.43.0)

- Nouveau modele `gemini-3.1-pro-preview`
- Image Grounding pour GoogleSearch
- Configuration MCP server-side
- **Breaking (experimental seulement)** : types MIME de l'API Interactions changes en enums — ne concerne que l'API experimentale Interactions, pas l'usage standard `generateContent`

- [ ] `@google/genai` 1.42.0 -> 1.43.0

**Difficulte : Trivial** — Le projet utilise `generateContent` standard, pas l'API Interactions.

---

## 3. Mises a jour avec breaking changes necessitant des modifications de code

### Sentry SDK (10.39.0 -> 10.40.0) `BREAKING`

**Breaking change principal :**
- **Import du plugin Vite deplace** : `@sentry/tanstackstart-react` -> `@sentry/tanstackstart-react/vite`
- Pino >= 9.10 requis (deja OK avec pino 10.3.1)

**Nouvelles features :**
- Middlewares globaux pour TanStack Start : `sentryGlobalRequestMiddleware` et `sentryGlobalFunctionMiddleware` pour capturer les exceptions non gerees dans les API routes et server functions
- Amelioration du tracking user dans les sessions
- Widget Feedback : `setTheme()` pour le dark mode dynamique

**Modification requise :**
```
// vite.config.ts ligne 4
- import { sentryTanstackStart } from '@sentry/tanstackstart-react'
+ import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
```

- [ ] `BREAKING` `@sentry/tanstackstart-react` 10.39.0 -> 10.40.0

**Difficulte : Facile** — 1 ligne a modifier dans `vite.config.ts`. Optionnel : ajouter les middlewares globaux.

---

### Recharts (2.15.4 -> 3.7.0) `BREAKING`

**Rewrite majeur** de la gestion d'etat interne (~3500 tests). Breaking changes principaux :

- `accessibilityLayer` passe a `true` par defaut (navigation clavier activee)
- `margin` type plus strict : necessite les 4 valeurs (`top`, `right`, `bottom`, `left`)
- `TooltipProps` renomme en `TooltipContentProps`
- `CategoricalChartState` retire des event handlers
- `Customized` ne recoit plus l'etat interne (utiliser les nouveaux hooks)
- Suppression de props : `activeIndex`, `alwaysShow`, `isFront`, `animateNewValues`, `blendStroke`
- Z-index determine par l'ordre JSX
- `CartesianGrid` avec axes multiples necessite `xAxisId`/`yAxisId`
- Dependencies `recharts-scale` et `react-smooth` supprimees (bundle plus leger)

**Nouvelles features :**
- Composants custom directement dans l'arbre du chart (sans `<Customized />`)
- Tooltip portal (`portal` prop)
- YAxis auto-width (`width="auto"`)
- `responsive` prop built-in (plus besoin de `ResponsiveContainer` wrapper)
- Nouveaux hooks : `useXAxisDomain`, `useYAxisDomain`, `useMargin`, `useIsTooltipActive`
- Z-Index support (v3.4+)
- Deprecations recentes : `Cell` -> `shape` prop, `activeShape`/`inactiveShape` -> `shape`

**Impact sur le projet :**
- `chart.tsx` (shadcn) : ajouter `initialDimension` sur `ResponsiveContainer` pour eviter les warnings SSR
- `trends-chart.tsx` : le `margin={{ left: 12, right: 12 }}` doit inclure les 4 valeurs

- [ ] `BREAKING` `recharts` 2.15.4 -> 3.7.0

**Difficulte : Facile** — Usage minimal (2 fichiers). Modifier `margin` et ajouter `initialDimension`. Verifier le composant shadcn chart.

---

## 4. BLOQUE — Ne pas mettre a jour maintenant

### ESLint (9.39.3 -> 10.0.2) `BREAKING` `BLOQUE`

**Raison du blocage : `eslint-plugin-react` est CASSE avec ESLint 10.**
- `TypeError: contextOrFilename.getFilename is not a function` — issue #3977 ouverte, pas de fix release
- `@viclafouch/eslint-config-viclafouch` v5 depend de `eslint-plugin-react ^7.37.5` qui crash
- `eslint-plugin-react-hooks` a un peerDep mismatch (accepte seulement `^9.0.0`)

**Breaking changes (pour reference future) :**
- Node.js >= 20.19.0 requis (OK avec Node 24)
- Systeme eslintrc completement retire (OK, deja flat config)
- `/* eslint-env */` comments deviennent des erreurs
- 3 nouvelles rules dans `eslint:recommended` : `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`
- JSX reference tracking active (meilleure analyse de scope)
- APIs deprecated retirees (`context.getFilename()`, etc.) — c'est ce qui casse `eslint-plugin-react`

**A surveiller :**
1. `eslint-plugin-react` v7.38+ ou v8.x avec fix `getFilename`
2. `eslint-plugin-react-hooks` avec peerDep `^10.0.0`
3. `@viclafouch/eslint-config-viclafouch` v6+ compatible ESLint 10

- [ ] `BLOQUE` `eslint` 9.39.3 -> 10.0.2 — attendre compatibilite de l'ecosysteme

**Difficulte : Bloque** — Impossible tant que `eslint-plugin-react` n'est pas compatible.

---

## Ordre recommande d'execution

1. **Triviales d'abord** : Algolia, @types/node, @tanstack/react-virtual, @ffmpeg/core, Tailwind CSS
2. **Mineures sans code** : Lucide, @google/genai, @tanstack/react-pacer, Stripe, Better Auth
3. **TanStack Router/Start** : modifier les 3 versions pinnees, build + test
4. **Sentry** : modifier l'import dans vite.config.ts
5. **Recharts** : modifier chart.tsx et trends-chart.tsx
6. **ESLint** : ATTENDRE

---

## Commandes

```bash
# Etape 1 — Triviales
pnpm update @algolia/client-insights @algolia/client-search @algolia/recommend @tanstack/react-virtual @types/node tailwindcss @tailwindcss/vite

# @ffmpeg/core est pinne, modifier manuellement dans package.json : "0.12.9" -> "0.12.10"

# Etape 2 — Mineures
pnpm update lucide-react @google/genai stripe better-auth @better-auth/stripe

# @tanstack/react-pacer : modifier "^0.19.4" -> "^0.20.0" dans package.json puis pnpm install

# Etape 3 — TanStack Router (pinne sans ^)
# Modifier manuellement dans package.json les 3 packages : "1.161.1" -> "1.163.2"
# puis pnpm install

# Etape 4 — Sentry (pinne sans ^)
# Modifier "10.39.0" -> "10.40.0" dans package.json
# Modifier l'import dans vite.config.ts
# puis pnpm install

# Etape 5 — Recharts (pinne sans ^)
# Modifier "2.15.4" -> "3.7.0" dans package.json
# Modifier chart.tsx et trends-chart.tsx
# puis pnpm install
```

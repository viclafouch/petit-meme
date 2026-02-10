# Audit — Mises à jour des dépendances

**Date :** 2026-02-10

| Priorité | Nombre |
|----------|--------|
| CRITIQUE (breaking changes majeurs) | 3 |
| IMPORTANTE (features / perf) | 9 |
| ROUTINE (patch / types) | 16 |
| A SUPPRIMER (dead code) | 5 (+1 doublon) |
| **Total packages à mettre à jour** | **33** |

---

## Légende — Indice de mise à jour (/10)

- **9-10 :** Mettre à jour immédiatement, aucun risque
- **7-8 :** Mettre à jour rapidement, effort minimal
- **5-6 :** Mettre à jour avec précaution, tester après
- **3-4 :** Attendre, effort important ou dépendances bloquantes
- **1-2 :** Ne pas mettre à jour pour l'instant

---

## CRITIQUE — Breaking changes majeurs

---

### `better-auth` + `@better-auth/stripe` — 1.3.12 → 1.4.18

**Indice de mise à jour : 8/10**

La v1.4.0 est une release massive avec des dizaines de nouvelles fonctionnalités et plusieurs breaking changes.

#### Breaking changes

1. **ESM only** — Le package est désormais ESM uniquement (`"type": "module"`). Le projet utilise déjà ESM donc impact minimal.
2. **Standard Schema** — Remplacement de `ZodType` par `@standard-schema/spec` dans le core. Les validations custom utilisant les types Zod internes de better-auth devront être adaptées.
3. **JWE pour les cookies session** — Les cookies de cache de session utilisent désormais JWE (chiffrement) par défaut. Tous les utilisateurs existants seront déconnectés à la mise à jour.
4. **Database joins** — Le moteur interne utilise désormais des joins SQL au lieu de requêtes séparées. Performance améliorée mais potentiellement des incompatibilités avec des hooks custom sur les queries.
5. **Endpoints `forgetPassword` supprimés** — Les endpoints dépréciés de reset de mot de passe sont supprimés. Vérifier que le code utilise les nouveaux endpoints.
6. **`ssoClient` export supprimé** — Export déprécié retiré du plugin client.
7. **`generateId` type déprécié** dans `options.advanced`.

#### Nouvelles fonctionnalités pertinentes

- **Stateless session management** — Sessions sans DB lookup à chaque requête
- **Session store chunking** — Support des gros payloads session
- **Automatic IP detection** côté serveur
- **UUID support** natif
- **Auto-index CLI** — Génère les index DB nécessaires
- **`auth.api.verifyPassword`** — Endpoint de vérification de mot de passe
- **`ctx.isTrustedDomain`** helper
- **`storeStateStrategy`** — Contrôle du stockage d'état OAuth
- **Adapter join support** — Joins SQL dans l'adapter
- **Account data in cookie** — Stockage optionnel des données compte en cookie
- **`disableSignal` client option** — Désactive les AbortSignal clients
- **Stripe plugin : support v19, `locale` option pour `upgradeSubscription`, `StripePlugin` type, flexible plan limits**

#### Bug fixes importants pour le projet

- Fix type mismatch `banned` sur `UserWithRole` — correspond au `@ts-expect-error` dans `src/server/user.ts`
- Fix OAuth token refresh quand les tokens sont chiffrés
- Fix validation email manquante
- Fix `deleteUser` qui appelle désormais les DB hooks
- TanStack imports mis à jour pour utiliser le subpath server

#### Migration

1. `npm install better-auth@1.4.18 @better-auth/stripe@1.4.18`
2. Vérifier la compatibilité Standard Schema avec les validations custom
3. Préparer les utilisateurs à une déconnexion (JWE cookies)
4. Tester les endpoints de reset de mot de passe
5. Vérifier que `@ts-expect-error` dans `src/server/user.ts` peut être retiré (fix du type `UserWithRole`)
6. `npm run build` + test complet du flow auth

---

### `stripe` — 18.5.0 → 20.3.1

**Indice de mise à jour : 4/10**

Deux versions majeures à traverser. **Attention :** `@better-auth/stripe` v1.4.x a upgradé vers Stripe v19.1.0. Vérifier la compatibilité avec v20 avant de mettre à jour au-delà de v19.

#### Breaking changes v19.0.0 (API version `2025-09-30.clover`)

1. **Drop Node < 16** — Le projet utilise Node récent, pas d'impact.
2. **V2 Event namespace** — `Stripe.V2.EventDestination` → `Stripe.V2.Core.EventDestination`, `Stripe.V2.Event` → `Stripe.V2.Core.Event`. Impact seulement si on utilise les V2 Events.
3. **`parseThinEvent` renommé** → `parseEventNotification`. Return type changé de `ThinEvent` à `EventNotification` (union typée).
4. **`EventNotification.context`** — Changé de `string` à `StripeContext` object.
5. **V2 delete methods** retournent désormais `V2DeletedObject` au lieu de void.
6. **Nullable properties V2** — `prop: string | null` → `prop?: string` dans les API V2.
7. **`Discount.coupon` supprimé** → Utiliser `Discount.source.coupon`. Impact probable si le code accède à `discount.coupon`.
8. **`iterations` supprimé** sur les phases d'abonnement schedule.
9. **`link` et `pay_by_bank` supprimés** de `PaymentMethodUpdateParams`.
10. **Fix file uploads Bun** — Corrige un bug dans les versions 18.1.0 à 18.5.0.

#### Breaking changes v20.0.0 (API version `2025-11-17.clover`)

1. **`V2.Core.EventListParams`** — `gt`, `gte`, `lt`, `lte` remplacés par `created`.
2. **V2 array serialization** — Format indexé (`?include[0]=foo`) au lieu de répété (`?include=foo`). Peut casser des tests mockés.

#### Migration recommandée

**Étape 1 :** Mettre à jour vers v19.3.1 (compatibilité better-auth/stripe v1.4.x).
**Étape 2 :** Évaluer si v20 est nécessaire — le projet n'utilise probablement pas les V2 APIs, donc les breaking changes v20 ont un impact limité.

1. Vérifier tous les usages de `discount.coupon` dans le code
2. Vérifier les webhook handlers pour les changements de namespace V2
3. `npm install stripe@19.3.1` dans un premier temps
4. Test complet des flows de paiement et webhooks

---

### `eslint` — 9.39.2 → 10.0.0

**Indice de mise à jour : 3/10**

ESLint 10 est fraîchement sorti. **Bloqueur potentiel :** la compatibilité de `@viclafouch/eslint-config-viclafouch` avec ESLint 10.

#### Breaking changes

1. **Suppression complète du support eslintrc** — Seul le flat config est supporté. Le projet utilise déjà le flat config, pas d'impact direct.
2. **Suppression des méthodes dépréciées de `SourceCode`** — `getTokenOrCommentBefore`, etc. Impact sur les plugins custom.
3. **Suppression des méthodes dépréciées du rule context** — Impact sur les plugins qui utilisent `context.getScope()` etc.
4. **`chalk` remplacé par `styleText`** — Impact si des formatters custom utilisent chalk.
5. **JSX reference tracking activé par défaut** — Peut générer de nouveaux warnings/errors dans le code JSX existant.
6. **Ajout de `name` obligatoire aux configs** — Les configs sans `name` émettent un warning.
7. **`minimatch` mis à jour vers v10** — Changement potentiel de comportement des globs.
8. **Rule tester plus strict** — Impact seulement si on a des tests custom de règles ESLint.

#### Prérequis

- **Vérifier que `@viclafouch/eslint-config-viclafouch` supporte ESLint 10** — C'est le bloqueur principal. La version actuelle est une beta (`4.22.1-beta.1`).
- Tous les plugins ESLint utilisés doivent aussi supporter v10.

#### Migration

1. Attendre que `@viclafouch/eslint-config-viclafouch` supporte officiellement ESLint 10
2. `npm install eslint@10`
3. `npm run lint` et corriger les éventuelles nouvelles erreurs (JSX reference tracking)
4. Ajouter des `name` aux configs si nécessaire

---

## IMPORTANTE — Features et performances

---

### `@tanstack/react-router` + `@tanstack/react-start` + devtools + SSR query — 1.150.0 → 1.159.5

**Indice de mise à jour : 9/10**

9 versions mineures, principalement des bug fixes et améliorations de performance. Aucun breaking change.

#### Changements notables

- **v1.158.0 :** `routeId` passé dans `context`/`beforeLoad` — utile pour la logique conditionnelle basée sur la route
- **v1.158.1 :** Fix de la logique `AbortError` lors de la navigation rapide
- **v1.158.2 :** Résolution des fonctions env-only à travers les chaînes de re-export
- **v1.158.3 :** Ne plus passer le `signal` dans les server functions
- **v1.159.0 :** `transformAssetUrls` pour Vite
- **v1.159.3-5 :** Utilisation de `FastResponse` de srvx (perf)
- **v1.159.4 :** Fix `useParams` qui retourne les params parsés quand `strict: false`
- **v1.157.18 :** Améliorations de performance dans `matchRoutesInternal`

#### Migration

```bash
npm install @tanstack/react-router@latest @tanstack/react-start@latest @tanstack/react-router-devtools@latest @tanstack/react-router-ssr-query@latest
```

Test du build et navigation — pas de changement de code attendu.

---

### `prisma` + `@prisma/client` + `@prisma/adapter-pg` — 7.2.0 → 7.3.0

**Indice de mise à jour : 9/10**

Mise à jour de performance significative, aucun breaking change.

#### Changements notables

- **Nouveau `compilerBuild` option** — Choix entre `fast` (défaut, vitesse) et `small` (taille réduite) pour le Query Compiler
- **Raw queries bypasses** le Query Compiler — `$executeRaw` et `$queryRaw` sont envoyés directement au driver adapter, éliminant l'overhead. Impact positif direct sur `$queryRawUnsafe` utilisé dans `src/routes/api/reels.ts`
- **Pin better-sqlite3** pour éviter un bug SQLite 3.51.0 (pas pertinent ici, on utilise PostgreSQL)

#### Migration

```bash
npm install prisma@7.3.0 @prisma/client@7.3.0 @prisma/adapter-pg@7.3.0
npx prisma generate
```

Optionnel : ajouter `compilerBuild = "fast"` dans `schema.prisma` (c'est le défaut).

---

### `motion` / `framer-motion` — 12.26.2 → 12.34.0

**Indice de mise à jour : 8/10**

8 versions mineures de bug fixes et améliorations. Aucun breaking change.

#### Changements notables

- **v12.29.1 :** `useAnimate` respecte désormais les paramètres `reduced motion` de `MotionConfig`
- **v12.28.1 :** Fix `scale: "0%"` traité incorrectement comme valeur par défaut
- **v12.27.5 :** Fix nettoyage du pen gesture sur drag cancel
- **v12.27.4 :** Fix animations de path drawing dans Safari zoomé (switch vers des valeurs unitless)
- **v12.27.3 :** Fix drag gestures depuis éléments keyboard-accessible (button, textarea)
- **v12.27.2 :** Ajout de sourcemaps pour motion-dom et motion-utils

#### Action complémentaire

**Rappel audit dead-code :** Le projet utilise les DEUX packages `motion` et `framer-motion` (13 fichiers chacun). `motion` est le successeur et ré-exporte `framer-motion`. **Consolider vers `motion` uniquement** en remplaçant tous les imports `framer-motion` par `motion/react`.

#### Migration

```bash
npm install motion@latest framer-motion@latest
```

Puis consolider (tâche séparée) :
1. Remplacer tous les `import { ... } from 'framer-motion'` par `import { ... } from 'motion/react'`
2. `npm uninstall framer-motion`

---

### `@google/genai` — 1.37.0 → 1.40.0

**Indice de mise à jour : 8/10**

3 versions mineures de nouvelles fonctionnalités. Aucun breaking change.

#### Changements notables

- **v1.38.0 :**
  - ModelArmorConfig — support pour la sanitisation de prompts et réponses via Model Armor
  - Custom endpoints pour l'authentification avec Vertex AI
- **v1.39.0 :**
  - `registerFiles` pour utiliser des fichiers GCS avec mldev
  - Support du tuning par distillation
  - Paramètre `include_input` pour le endpoint Get Interaction
- **v1.40.0 :** Mises à jour de types mineures

#### Migration

```bash
npm install @google/genai@latest
```

Aucun changement de code nécessaire.

---

### `resend` — 6.7.0 → 6.9.1

**Indice de mise à jour : 9/10**

#### Changements notables

- **v6.8.0 :** Mises à jour de dépendances internes
- **v6.9.0 :** Support de la création de contacts avec segments et topics
- **v6.9.1 :** Mises à jour de dépendances (mailparser, react)

Aucun breaking change.

#### Migration

```bash
npm install resend@latest
```

---

### `react-email` + `@react-email/components` + `@react-email/preview-server`

**Versions :** `react-email` 5.2.1 → 5.2.8, `@react-email/components` 1.0.4 → 1.0.7, `@react-email/preview-server` 5.2.1 → 5.2.8

**Indice de mise à jour : 9/10**

#### Changements notables

- **5.2.2-5.2.3 :** Fix `email build` qui échouait systématiquement
- **5.2.4-5.2.5 :** Fix support Alpine Linux
- **5.2.6 :** Fix `RESEND_API_KEY` écrasée dans le preview email
- **5.2.7-5.2.8 :** Bug fixes divers

Aucun breaking change. Packages pinnés — mettre à jour les versions exactes dans package.json.

#### Migration

```bash
npm install @react-email/components@1.0.7 react-email@5.2.8 @react-email/preview-server@5.2.8
```

---

### `nitro` — 3.0.1-alpha.1 → 3.0.1-alpha.2

**Indice de mise à jour : 7/10**

#### Changements notables

- Support complet de rolldown et rolldown-vite
- Install size réduite à 9MB
- Performance runtime proche de 98% des performances natives (testé avec le preset standard sur Bun)
- Nouveaux exemples
- Plus proche de la **Beta**

#### Risque

Software alpha — changements possibles à chaque release. Mais l'alpha.2 est censé être plus stable que l'alpha.1 avec des tests contre des projets réels.

#### Migration

```bash
npm install nitro@3.0.1-alpha.2
npm run build
```

Tester le build et le runtime en production.

---

### `@tanstack/react-form` — 1.27.7 → 1.28.0

**Indice de mise à jour : 9/10**

Version mineure. Le projet utilise TanStack Form pour tous les formulaires admin et les forms de connexion/inscription. Aucun breaking change attendu dans une version mineure.

#### Migration

```bash
npm install @tanstack/react-form@latest
```

---

### `@tanstack/react-pacer` — 0.18.0 → 0.19.4

**Indice de mise à jour : 7/10**

Package en 0.x — des breaking changes sont possibles dans les versions mineures. Vérifier le changelog détaillé avant mise à jour.

#### Migration

```bash
npm install @tanstack/react-pacer@latest
npm run build
```

Vérifier les imports et API utilisées.

---

## ROUTINE — Patches et mises à jour de types

Ces mises à jour sont sûres et peuvent être appliquées en bloc.

| Package | Actuelle | Dernière | Type | Indice |
|---------|----------|----------|------|--------|
| `react` | 19.2.3 | 19.2.4 | patch | 10/10 |
| `react-dom` | 19.2.3 | 19.2.4 | patch | 10/10 |
| `@tanstack/react-query` | 5.90.17 | 5.90.20 | patch | 10/10 |
| `@tanstack/react-query-devtools` | 5.91.2 | 5.91.3 | patch | 10/10 |
| `lucide-react` | 0.562.0 | 0.563.0 | minor (nouvelles icônes) | 10/10 |
| `mixpanel-browser` | 2.73.0 | 2.74.0 | minor | 9/10 |
| `algoliasearch` | 5.46.3 | 5.48.0 | minor | 9/10 |
| `react-hotkeys-hook` | 5.2.3 | 5.2.4 | patch | 10/10 |
| `remeda` | 2.33.4 | 2.33.6 | patch | 10/10 |
| `dotenv` | 17.2.3 | 17.2.4 | patch | 10/10 |
| `@vitejs/plugin-react` | 5.1.2 | 5.1.4 | patch | 10/10 |
| `@types/node` | 25.0.9 | 25.2.2 | types | 10/10 |
| `@types/react` | 19.2.8 | 19.2.13 | types | 10/10 |
| `vite-node` | 5.2.0 | 5.3.0 | minor | 9/10 |
| `vite-tsconfig-paths` | 6.0.4 | 6.1.0 | minor | 9/10 |
| `zod` | 4.3.5 | 4.3.6 | patch | 10/10 |
| `zustand` | 5.0.10 | 5.0.11 | patch | 10/10 |

#### Migration en bloc

```bash
npm update
```

Ou pour forcer les dernières versions dans le range semver :

```bash
npx taze -Ilw
```

---

## A SUPPRIMER — Packages morts

Identifiés dans l'audit dead-code. Aucun import trouvé dans `src/`.

| Package | Raison | Action |
|---------|--------|--------|
| `@prisma/extension-accelerate` | Jamais importé. Le DB layer utilise `@prisma/adapter-pg` | `npm uninstall` |
| `@date-fns/tz` | Jamais importé. Le code utilise `date-fns` directement | `npm uninstall` |
| `@radix-ui/react-use-controllable-state` | Jamais importé dans `src/` | `npm uninstall` |
| `usehooks-ts` | Jamais importé dans `src/` | `npm uninstall` |
| `algoliasearch` | Le code importe `@algolia/client-search` (dep transitive). Aucun import direct | `npm uninstall` puis `npm install @algolia/client-search` |

### Doublon de package

| Packages | Action |
|----------|--------|
| `motion` + `framer-motion` | Consolider vers `motion` uniquement |

---

## Packages déjà à jour

Les packages suivants sont à leur dernière version et ne nécessitent aucune action :

`@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-avatar`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `@t3-oss/env-core`, `@tailwindcss/vite`, `@tanstack/react-table`, `@tanstack/react-virtual`, `@types/react-dom`, `canvas-confetti`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `filesize`, `hls.js`, `husky`, `media-chrome`, `radix-ui`, `react-markdown`, `react-tweet`, `schema-dts`, `sonner`, `spin-delay`, `stripe` (voir section critique), `tailwind-merge`, `tailwindcss`, `tw-animate-css`, `typescript`, `vite`

---

## Roadmap de mise à jour

### Phase 1 — Routine (risque zéro, 15 min)

1. **Appliquer tous les patches** : `npx taze -Ilw` pour les 16 packages routine
2. **Supprimer les 5 packages morts** : `npm uninstall @prisma/extension-accelerate @date-fns/tz @radix-ui/react-use-controllable-state usehooks-ts algoliasearch` puis `npm install @algolia/client-search`
3. `npm run build` pour vérifier

### Phase 2 — Importantes sans risque (30 min)

4. **TanStack Router ecosystem** → 1.159.5
5. **Prisma** → 7.3.0 + `npx prisma generate`
6. **@google/genai** → 1.40.0
7. **Resend** → 6.9.1
8. **React Email** → 5.2.8 / 1.0.7
9. **TanStack Form** → 1.28.0
10. **Motion** → 12.34.0

### Phase 3 — Importantes avec précaution (1-2h)

11. **TanStack Pacer** → 0.19.4 (vérifier API)
12. **Nitro** → 3.0.1-alpha.2 (tester le build)
13. **Consolider motion/framer-motion** → `motion` uniquement

### Phase 4 — Critiques (demi-journée chacune)

14. **better-auth** 1.3.12 → 1.4.18 — Préparer la déconnexion des utilisateurs, tester tout le flow auth
15. **stripe** 18.5.0 → 19.3.1 — Vérifier la compatibilité better-auth/stripe, tester les paiements

### Phase 5 — A évaluer

16. **eslint** 9 → 10 — Attendre la compatibilité de `@viclafouch/eslint-config-viclafouch`
17. **stripe** 19.x → 20.x — Évaluer après la phase 4, breaking changes limités

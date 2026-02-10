# Plan — Correction des audits

Chaque étape correspond à un audit réalisé. Les détails complets (fichiers, lignes, fixes) sont dans `audits/<nom>.md`.

**Workflow par étape :**
1. Lire l'audit correspondant dans `audits/`
2. Appliquer les corrections
3. `npm run lint:fix`
4. Lancer l'agent `code-refactoring` si code significatif modifié
5. Cocher `[x]` les items terminés ici

---

## Étape 1 — ESLint config v5

> Audit : [`audits/dependency-updates.md`](../audits/dependency-updates.md) — Section `@viclafouch/eslint-config-viclafouch`

Mettre à jour en premier pour que tout le code modifié ensuite soit lint avec les nouvelles règles.

- [ ] `npm install -D prettier@3 @viclafouch/eslint-config-viclafouch@5`
- [ ] Réécrire `eslint.config.js` : retirer `baseConfig`, ajouter `hooksConfig` + `jsxA11yConfig`, corriger l'ordre (ignores → typescript → react → hooks → a11y → imports → prettier)
- [ ] `npm run lint:fix` et corriger les nouvelles erreurs
- [ ] Vérifier la règle `better-tailwindcss/enforce-consistent-line-wrapping`

---

## Étape 2 — Dead code

> Audit : [`audits/dead-code.md`](../audits/dead-code.md)

Nettoyer pour réduire le bruit dans les étapes suivantes.

- [ ] Supprimer les 11 fichiers inutilisés
- [ ] Retirer `export` des 8 symboles utilisés uniquement localement
- [ ] Supprimer les 2 fonctions mortes (`matchIsVideoFullyReady`, `useCloseDialog`)
- [ ] Corriger le bug dans `merge-ref.ts` (`=== 0` → `=== 1`)
- [ ] `npm uninstall` les 4 packages inutilisés
- [ ] Remplacer `algoliasearch` par `@algolia/client-search` explicite

---

## Étape 3 — Dependency updates (routine)

> Audit : [`audits/dependency-updates.md`](../audits/dependency-updates.md) — Phases 1 et 2

Appliquer les mises à jour sans risque pendant que la codebase est propre.

- [ ] Appliquer les 16 patches routine (`npx taze -Ilw`)
- [ ] Mettre à jour TanStack Router ecosystem → 1.159.5
- [ ] Mettre à jour Prisma → 7.3.0 + `npx prisma generate`
- [ ] Mettre à jour @google/genai, resend, react-email, TanStack Form
- [ ] Mettre à jour motion/framer-motion → 12.34.0
- [ ] Mettre à jour nitro → 3.0.1-alpha.2
- [ ] `npm run build` pour valider

---

## Étape 4 — Security

> Audit : [`audits/security.md`](../audits/security.md)

Corriger les vulnérabilités critiques avant toute autre modification fonctionnelle.

- [ ] Fix CRITICAL : injection SQL dans `reels.ts` (`$queryRawUnsafe` → `$queryRaw` avec template tagged)
- [ ] Fix HIGH : authentification webhook Bunny (`bunny.ts`)
- [ ] Fix HIGH : middleware admin manquant sur `getListUsers`
- [ ] Fix HIGH : `minPasswordLength` serveur 4 → 12
- [ ] Fix HIGH : rate limiting sur les endpoints sensibles
- [ ] Fix MEDIUM : flag `secure` sur le cookie `anonId`
- [ ] Fix MEDIUM : injection de filtres Algolia
- [ ] Fix MEDIUM : authentification `getVideoPlayData`
- [ ] Fix LOW : en-têtes de sécurité, CSP, HSTS

---

## Étape 5 — GDPR

> Audit : [`audits/gdpr.md`](../audits/gdpr.md)

Conformité légale — les items CRITICAL sont des obligations réglementaires.

- [ ] CRITICAL : implémenter un bandeau de consentement cookies (bloquer Mixpanel et `anonId` sans consentement)
- [ ] CRITICAL : gater Mixpanel derrière le consentement, retirer `ignore_dnt: true`, stopper l'envoi de PII
- [ ] CRITICAL : créer la page politique de confidentialité (`/privacy`)
- [ ] HIGH : créer la page mentions légales (`/mentions-legales`)
- [ ] HIGH : ajouter checkbox CGU + lien privacy au formulaire d'inscription
- [ ] HIGH : implémenter l'export de données utilisateur (JSON)
- [ ] HIGH : définir et implémenter les durées de rétention + cron de nettoyage
- [ ] MEDIUM : ajouter l'édition de profil (nom, email)
- [ ] MEDIUM : compléter le flux de suppression (Mixpanel, Stripe)
- [ ] MEDIUM : conditionner les `console.log` de PII à `NODE_ENV`
- [ ] LOW : auto-héberger Google Fonts

---

## Étape 6 — Backend performance

> Audit : [`audits/backend-performance.md`](../audits/backend-performance.md)

- [ ] Fix CRITICAL : `getRandomMeme` — remplacer le chargement de tous les memes par un `ORDER BY RANDOM() LIMIT 1`
- [ ] Fix HIGH : double fetch session dans `getAdminSession`
- [ ] Fix HIGH : paralléliser les requêtes séquentielles dans `toggleBookmark` et `deleteMeme`
- [ ] Fix HIGH : proxy vidéo — rediriger vers Bunny CDN au lieu de streamer via Node
- [ ] Fix MEDIUM : ajouter des index Prisma manquants
- [ ] Fix MEDIUM : ajouter `staleTime` aux queries TanStack Query
- [ ] Fix MEDIUM : optimiser les cron jobs (batch, curseur)
- [ ] Fix LOW : réduire la taille des payloads API

---

## Étape 7 — Duplicate code

> Audit : [`audits/duplicate-code.md`](../audits/duplicate-code.md)

Dédupliquer avant le refactoring pour éviter de refactorer du code en double.

- [ ] HIGH : extraire `useToggleBookmark` hook (~50 lignes dupliquées)
- [ ] HIGH : extraire `useKeywordsField` hook + composant `KeywordsField` (~70 lignes)
- [ ] HIGH : extraire `createMemeWithVideo` server function (~40 lignes)
- [ ] MEDIUM : extraire `MEME_FULL_INCLUDE` constante Prisma (5 répétitions)
- [ ] MEDIUM : extraire `DEFAULT_MEME_TITLE` et `NEWS_CATEGORY_SLUG` constantes
- [ ] MEDIUM : extraire `FormFooter` composant (4 répétitions)
- [ ] MEDIUM : extraire `MemeVideoThumbnail` composant
- [ ] MEDIUM : extraire `safeAlgoliaOp` wrapper
- [ ] MEDIUM : extraire `searchMemesFromAlgolia` helper
- [ ] LOW : consolider les petites duplications restantes

---

## Étape 8 — Code refactoring

> Audit : [`audits/code-refactoring.md`](../audits/code-refactoring.md)

- [ ] Fix bug : erreur avalée dans `utils.ts` (catch qui perd le message détaillé)
- [ ] Extraire le ternaire imbriqué dans `studio-dialog.tsx`
- [ ] Découper les composants > 200 lignes (MemeForm, $memeId, SignupForm, PlayerDialog)
- [ ] Refactorer `getTresholdMs` → objet params + corriger typo → `getThresholdMs`
- [ ] Refactorer les mutations `let` → fonctions pures
- [ ] Ajouter `satisfies` aux `as const` (`BUNNY_STATUS`, FAQ items)
- [ ] Renommer `open` → `isOpen` dans mobile-nav et user-dropdown
- [ ] Supprimer les commentaires inutiles
- [ ] Remplacer les `return () => {}` inutiles par `return`
- [ ] Remplacer `@ts-ignore` par `@ts-expect-error` avec explication
- [ ] Supprimer le code commenté mort

---

## Étape 9 — Tailwind CSS

> Audit : [`audits/tailwind.md`](../audits/tailwind.md)

- [ ] Bulk replace `w-full h-full` → `size-full` (~20 emplacements)
- [ ] Remplacer `w-N h-N` → `size-N` sur les icônes (~7 emplacements)
- [ ] Remplacer les couleurs hardcodées gray/zinc/stone par les tokens thème
- [ ] Résoudre le conflit `h-7 w-7` + `size-6` dans twitter-form et download-from-twitter-form
- [ ] Remplacer les `hover:scale-*` interdits par des transitions d'opacité
- [ ] Appliquer les shorthands restants (`px-6 py-6` → `p-6`, `right-0 left-0` → `inset-x-0`)
- [ ] Supprimer les classes mortes/redondantes (`max-w-full` avec `w-full`, `container mx-auto`)
- [ ] Remplacer `mt-*`/`space-y-*` → `gap` où applicable

---

## Étape 10 — React performance

> Audit : [`audits/react-performance.md`](../audits/react-performance.md)

- [ ] Fix HIGH : `createRef` dans `useMemo` pour Reels → extraire hors du render
- [ ] Fix MEDIUM : dépendances inutiles dans les `useMemo`
- [ ] Fix MEDIUM : guard SSR pour `IntersectionObserver`
- [ ] Fix MEDIUM : cleanup FFmpeg dans `useVideoProcessor`
- [ ] Fix MEDIUM : optimiser `DialogProvider` store subscription
- [ ] Fix LOW : composants à mémoïser, callbacks à stabiliser
- [ ] Fix LOW : virtualisation des listes longues

---

## Étape 11 — Dependency updates (breaking changes)

> Audit : [`audits/dependency-updates.md`](../audits/dependency-updates.md) — Phases 3 à 5

- [ ] Consolider `motion`/`framer-motion` → `motion` uniquement
- [ ] Mettre à jour `better-auth` 1.3.12 → 1.4.18 (préparer déconnexion utilisateurs)
- [ ] Mettre à jour `stripe` 18.5.0 → 19.3.1 (compatible better-auth/stripe)
- [ ] Évaluer `stripe` 19.x → 20.x

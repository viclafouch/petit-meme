# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Better Auth

**Type `UserWithRole` vs `InferUser` :** Bug interne où `UserWithRole.role` est `string | undefined` mais le type inféré retourne `string | null | undefined`. Fix appliqué : type `SessionUser` custom dans `src/lib/role.ts`.

- [ ] Ouvrir une issue upstream sur Better Auth pour aligner `UserWithRole.role` avec le type inféré

**Issues à surveiller :** [#2596](https://github.com/better-auth/better-auth/issues/2596), [#3033](https://github.com/better-auth/better-auth/issues/3033), [#7452](https://github.com/better-auth/better-auth/issues/7452)

---

## Algolia — Activer les modèles Recommend

- [ ] Activer "Related Items" dans le dashboard Algolia → Recommend
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent
- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

---

## Tailwind — Enrichir l'agent tailwind-audit avec `canonicalize`

**Contexte :** Tailwind v4 introduit une API `canonicalizeCandidates` qui remplace automatiquement les classes dépréciées ou verbeuses par leur forme canonique (ex: `break-words` → `wrap-break-word`, `bg-gradient-to-r` → `bg-linear-to-r`, `w-6 h-6` → `size-6`). La commande CLI `tailwindcss canonicalize` a été [mergée le 2026-03-11](https://github.com/tailwindlabs/tailwindcss/pull/19783) mais pas encore publiée.

- [ ] Surveiller les releases Tailwind (`npm view tailwindcss versions`). Quand `canonicalize` est disponible, mettre à jour l'agent tailwind-audit.

---

## Nitro — Override runtime Node.js 24

**Problème :** Nitro `3.0.1-alpha.2` ne supporte pas Node.js 24 dans sa liste `SUPPORTED_NODE_VERSIONS` ([nitrojs/nitro#3965](https://github.com/nitrojs/nitro/issues/3965)). Fix temporaire : override `runtime: 'nodejs24.x'` dans `vite.config.ts`.

**Fix upstream :** PR [nitrojs/nitro#3967](https://github.com/nitrojs/nitro/pull/3967) mergée mais pas encore publiée.

- [ ] Surveiller les releases Nitro. Quand une version ≥ `3.0.1` inclut le support Node 24, supprimer le bloc `vercel.functions.runtime` de `vite.config.ts`.

---

## SEO — Items restants

- [ ] Surveiller le Video Indexing Report dans Search Console
- [ ] Stocker `width`/`height` dans le modèle `Video` (migration additive) — permet des `og:video:width/height` corrects par meme au lieu du 1280x720 hardcodé

---

## Admin — Items reportés

- [ ] Rate limiting sur les preview deployments Vercel (infra)
- [ ] Rate limiting dédié sur le tracking share/download (dédoublonnage par user/meme)
- `getListUsers` extraction bloquée : module-level functions using `prismaClient` break Vite client bundle (TanStack Start only strips `.handler()` body)
- Bans temporaires (`banExpires`) — non prioritaire
- Extraction sous-composants `categories/`, `library/`, `downloader.tsx`

---

## Bug — Sérialisation `customErrorAdapter`

- [ ] **Bug sérialisation** : `customErrorAdapter` dans `start.ts` sérialise côté serveur (tag `$TSR/t/custom-error`) mais le plugin n'est pas enregistré côté client → erreur seroval à la désérialisation. Affecte TOUS les `StudioError` throwés depuis des server functions (PREMIUM_REQUIRED, UNAUTHORIZED, etc.) — jamais testé jusqu'ici. À investiguer : restart dev server, vérifier si `createStart` enregistre les adapters côté client, ou changer d'approche.

---

## Login Discord

- [ ] Créer une app Discord (Discord Developer Portal) — récupérer Client ID + Client Secret
- [ ] Ajouter le provider Discord dans la config Better Auth (`src/lib/auth.tsx`) — scopes `identify` + `email` (gérés automatiquement par Better Auth)
- [ ] Ajouter les env vars `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` dans `src/env/server.ts` (validation Zod) + `.env.development` + Vercel env prod
- [ ] Bouton "Se connecter avec Discord" dans les formulaires login/signup (`auth-dialog.tsx`)
- [ ] Tester le flow complet (login, link account Discord ↔ Twitter, avatar Discord)

---

## Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

---

## Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

---

## Migration ESLint + Prettier → oxlint + oxfmt ✅

**Terminée le 2026-03-27.** Migré de `@viclafouch/eslint-config-viclafouch` v5 vers `@viclafouch/oxc-config` v1.0.0-alpha.4 (oxlint + oxfmt).

- [x] Migrer path aliases `@/` → `~/`, `@admin/` → `~admin/` (commit séparé)
- [x] Supprimer ESLint, Prettier → installer oxlint, oxfmt, @viclafouch/oxc-config
- [x] Créer oxlint.config.ts et oxfmt.config.ts (sort imports custom)
- [x] Mettre à jour scripts, VS Code, husky
- [x] Supprimer ~36 eslint-disable comments obsolètes
- [x] Fixer import/no-cycle (getRouteApi), filename-case (Play.tsx), no-shadow (globalThis)
- [x] Convertir les eslint-disable restants en oxlint-disable dans les fichiers source (hors generated/ui/animate-ui/routeTree)

---

## Internationalisation — Backlog

- [ ] Synonymes EN Algolia — ajouter via dashboard quand contenu EN atteint une masse critique
- [ ] Sync incrémentale Algolia — tracker `updatedAt` au lieu de `replaceAllObjects` dans le cron (optimisation future)
- [ ] 3e langue — le schema DB est prêt (mapping `locale → contentLocales[]`), pas d'implémentation prévue pour l'instant

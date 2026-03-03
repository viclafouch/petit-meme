# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Better Auth — Incohérence de type `UserWithRole` vs `InferUser`

Bug interne Better Auth : `UserWithRole.role` est `string | undefined` mais le type inféré (`auth.$Infer.Session['user']`) retourne `string | null | undefined`. Aucune solution officielle.

**Fix appliqué :** type `SessionUser` custom dans `src/lib/role.ts` dérivé du type inféré. Plus aucune référence à `UserWithRole` dans le codebase.

**Reste à faire :**
- [ ] Ouvrir une issue upstream sur Better Auth pour aligner `UserWithRole.role` avec le type inféré

**Issues à surveiller :** [#2596](https://github.com/better-auth/better-auth/issues/2596), [#3033](https://github.com/better-auth/better-auth/issues/3033), [#7452](https://github.com/better-auth/better-auth/issues/7452)

---

## Refonte page Pricing — Items restants

Refonte complète livrée (plan annuel, toggle, social proof, FAQ, animations, SEO, a11y). Reste :

- [ ] Créer le Price ID annuel (29,99 €/an, récurrent yearly) dans Stripe Dashboard
- [ ] Ajouter `STRIPE_ANNUAL_PRICE_ID` dans les env vars Vercel + `.env`

**Hors scope (reporté) :** tableau comparatif features, témoignages, A/B testing

---

## Algolia — Items reportés

### Activer les modèles Recommend (quand suffisamment d'events)

- [ ] Activer "Related Items" dans le dashboard Algolia → Recommend
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent

### Synonymes anglais (dépend du passage bilingue)

- [ ] Ajouter les synonymes anglais (`"lmao" <-> "lol" <-> "rofl"`, `"bruh" <-> "bro"`, etc.)
- [ ] Mettre à jour `queryLanguages`, `indexLanguages`, `ignorePlurals`, `removeStopWords` à `["fr", "en"]`

### Boucle d'amélioration continue

- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

---

## Migration Railway → Vercel — Item restant

- [ ] Réactiver Sentry server-side tracing (`instrument-server.ts` + `wrapFetchWithSentry`) — bloqué par `require-in-the-middle` incompatible ESM dans Vercel serverless. Bug connu : [sentry-javascript#18859](https://github.com/getsentry/sentry-javascript/issues/18859). Surveiller les updates Sentry/OpenTelemetry.

---

## Anti-Scraping — Item restant

Phases 0-3 livrées (WAF Vercel, rate limiting in-memory, Bunny CDN Token Auth, logging Sentry). Reste :

- [ ] Migration Prisma à exécuter : `pnpm exec prisma migrate dev --name add_rate_limit_window_start`

---

## Backlog — Futures évolutions

### Admin — Items reportés

- [ ] Rate limiting sur les preview deployments Vercel (infra)
- [ ] Rate limiting dédié sur le tracking share/download (dédoublonnage par user/meme)
- `getListUsers` extraction bloquée : module-level functions using `prismaClient` break Vite client bundle (TanStack Start only strips `.handler()` body)
- Bans temporaires (`banExpires`) — non prioritaire
- Extraction sous-composants `categories/`, `library/`, `downloader.tsx`

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.). Inclut la stratégie d'index Algolia bilingue (index unique avec champ `lang` vs deux index séparés).

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

### Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : redirection www → apex (et supprimer le check manuel dans `server.ts`), CDN/cache, SSL, protection DDoS, Page Rules, etc.

---

## Optimisation Coûts Neon (mars 2026) ✅

Migration Neon terminée. DB sur neon.tech (free tier 191.9h/mois) au lieu du Vercel Marketplace ($39.59/mois).

**Config actuelle :** Projet `petit-meme`, `eu-central-1` (Frankfurt), Postgres 17. Branche `main` (prod) + branche `dev` (local). 0.25 CU, auto-suspend 5 min. Séparation env strict `.env.development` / `.env.production`.

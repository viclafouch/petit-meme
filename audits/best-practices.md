# Audit — Best Practices

> Learnings extraits des projets de reference **estcequecestlasaison** et **pasiopadelclub**. Ces deux projets utilisent le meme stack (TanStack Start, Vite, Nitro) et representent les bonnes pratiques a adopter.

| Categorie | Priorite | Items |
|-----------|----------|-------|
| Caching (QueryClient + Router + HTTP) | CRITICAL | 14 |
| SEO (meta, JSON-LD, sitemap, robots, PWA) | CRITICAL | 16 |
| Stripe (Payment Elements, webhooks, idempotence) | CRITICAL | 8 |
| Auth et Middleware (composable, beforeLoad, cookie cache) | CRITICAL | 5 |
| Images (srcSet, sizes, preload, WebP, picture) | HIGH | 9 |
| Server Functions (validation, method) | HIGH | 3 |
| Route Loaders (ensureQueryData, head) | HIGH | 6 |
| Security Headers + Env Vars | HIGH | 5 |
| Database / Drizzle (transactions, schema) | HIGH | 3 |
| Accessibilite (skip-link, ARIA, motion) | MEDIUM | 7 |
| Performance (debounce, placeholder, SSR) | MEDIUM | 4 |
| DX (Husky, taze, npmrc, useSyncExternalStore) | MEDIUM | 4 |
| Fonts | LOW | 3 |
| **Total** | | **87** |

---

## 1. Caching — CRITICAL

### QueryClient defaults

**Reference :**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * SECOND,
      gcTime: 5 * MINUTE,
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      networkMode: 'online',
      retry: false
    },
    mutations: {
      retry: false,
      networkMode: 'online',
      gcTime: 5 * MINUTE
    }
  }
})
```

**A faire dans memes-by-lafouch :**
- [ ] Definir `staleTime` global (30s minimum) — actuellement les queries refetchent a chaque mount
- [ ] Definir `gcTime` global (5 min)
- [ ] `refetchOnWindowFocus` seulement en production
- [ ] `retry: false` par defaut
- [ ] Overrides per-query pour les cas specifiques (search suggestions → 60s staleTime)

### Router options

**Reference :**
```typescript
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadDelay: 50,
  defaultPreloadStaleTime: 30_000,
  defaultPendingMs: 1000,
  defaultPendingMinMs: 200,
  notFoundMode: 'fuzzy',
  defaultViewTransition: true,
  scrollRestoration: true
})
```

**A faire dans memes-by-lafouch :**
- [ ] Activer `defaultPreload: 'intent'` — precharge les routes au hover
- [ ] `defaultPreloadDelay: 50` — delai court pour le prefetch
- [ ] `defaultPreloadStaleTime: 30_000` — donnees prefetchees valables 30s
- [ ] `defaultPendingMs: 1000` — afficher le loading apres 1s seulement
- [ ] `defaultPendingMinMs: 200` — eviter le flash de loading
- [ ] `defaultViewTransition: true` — transitions natives entre routes
- [ ] `scrollRestoration: true` — restaurer le scroll au retour

### HTTP Cache Headers (Nitro routeRules)

**Reference :**
```typescript
nitro({
  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
    '/images/**': { headers: { ...SECURITY_HEADERS, ...IMMUTABLE_CACHE } },
    '/fonts/**': { headers: { ...SECURITY_HEADERS, ...IMMUTABLE_CACHE } }
  }
})

const IMMUTABLE_CACHE = {
  'Cache-Control': 'public, max-age=31536000, immutable'
}
```

**A faire dans memes-by-lafouch :**
- [ ] Ajouter `routeRules` dans la config Nitro (vite.config.ts)
- [ ] Cache immutable (1 an) pour `/images/**` et `/fonts/**`

---

## 2. SEO — CRITICAL

### Helper SEO structure

**Reference** — fonction `seo()` qui retourne `{ meta, links }` :
```typescript
function seo({ title, description, keywords, image, imageAlt, pathname, ogType }: SeoParams) {
  return {
    meta: [
      { title: `${title} | ${SITE_NAME}` },
      { property: 'og:type', content: ogType },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: fullTitle },
      { property: 'og:url', content: url },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:image', content: ogImage },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: ogImageAlt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:image', content: ogImage },
      { name: 'twitter:image:alt', content: ogImageAlt }
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', hrefLang: 'fr', href: url }
    ]
  }
}
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier que le helper SEO couvre tous ces champs (og:image dimensions, og:locale, twitter:image:alt)
- [ ] Ajouter `canonical` et `alternate` hrefLang sur chaque route
- [ ] S'assurer que chaque route a un `head()` avec SEO complet

### Root route meta tags

**A faire dans memes-by-lafouch :**
- [ ] Ajouter `viewport-fit=cover` pour les ecrans encoche
- [ ] Ajouter `color-scheme`, `application-name`, `apple-mobile-web-app-*`, `format-detection`
- [ ] Verifier la presence de `theme-color`

### Anti-AI double protection

**Reference** — meta tag + HTTP header :
```typescript
{ name: 'robots', content: 'index,follow,noai,noimageai' },
{ httpEquiv: 'X-Robots-Tag', content: 'noai,noimageai' }
```

**A faire dans memes-by-lafouch :**
- [ ] Ajouter le double `noai,noimageai` (meta + httpEquiv)

### Structured Data (JSON-LD) type-safe

**Reference** — utiliser `schema-dts` pour le typage :
```typescript
import type { WebSite, WithContext } from 'schema-dts'

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  // ...
} as const satisfies WithContext<WebSite>
```

Schemas pertinents :
- `WebSite` avec `SearchAction` (global, dans `__root.tsx`)
- `FAQPage` avec microdata (si page FAQ)
- `BreadcrumbList` (navigation fil d'ariane)
- `VideoObject` (pages meme video)

**A faire dans memes-by-lafouch :**
- [ ] Ajouter un schema `WebSite` global avec `SearchAction`
- [ ] Ajouter des schemas pertinents par page (VideoObject, BreadcrumbList)
- [ ] Utiliser `schema-dts` + `as const satisfies WithContext<Type>`
- [ ] Ajouter microdata FAQ si une page FAQ existe

### Sitemap dynamique

**A faire dans memes-by-lafouch :**
- [ ] Creer une route `sitemap[.]xml.ts` si inexistante
- [ ] Generer dynamiquement avec toutes les pages publiques + memes
- [ ] Inclure `lastmod`, `changefreq`, `priority` par page
- [ ] Referencier dans `robots.txt`

### robots.txt

**Reference :**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://...
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier/creer `robots.txt` avec lien vers sitemap
- [ ] Bloquer `/admin/` et `/api/`

### staleTime: Infinity pour les pages statiques

**A faire dans memes-by-lafouch :**
- [ ] Ajouter `staleTime: Infinity` sur les routes statiques (CGU, mentions legales, etc.)

### PWA manifest

**A faire dans memes-by-lafouch :**
- [ ] Creer un `manifest.webmanifest` complet (name, short_name, icons, theme_color, lang)
- [ ] Ajouter le `<link rel="manifest">` dans `__root.tsx`
- [ ] Verifier que tous les favicons sont declares avec les bons sizes et types

### Preload viewport sur les liens de navigation

**Reference** — prefetch au viewport pour les liens critiques :
```typescript
{ linkOptions: { to: '/tarifs', preload: 'viewport' }, label: 'Tarifs' }
```

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `preload: 'viewport'` sur les liens de navigation les plus importants

---

## 3. Images — HIGH

### Composant image optimise

**Attributs critiques :**
- `srcSet` avec plusieurs tailles (256w, 512w)
- `sizes` responsive (`(max-width: 640px) 144px, 170px`)
- `width` + `height` explicites (evite le CLS)
- `loading="lazy"` par defaut
- `fetchPriority="high"` pour les images above-the-fold
- `decoding="async"` par defaut, `"sync"` pour les images prioritaires

**A faire dans memes-by-lafouch :**
- [ ] Creer un composant `MemeImage` / `MemeThumb` avec ces attributs
- [ ] Generer des thumbnails en plusieurs tailles (WebP)
- [ ] Utiliser `srcSet` + `sizes` sur toutes les images de memes
- [ ] Toujours specifier `width` + `height` pour eviter le CLS
- [ ] `loading="lazy"` par defaut, `"eager"` + `fetchPriority="high"` pour les premiers items visibles

### `<picture>` avec WebP + fallback

**Reference :**
```tsx
<picture>
  <source srcSet="/images/hero.webp" type="image/webp" />
  <img src="/images/hero.png" alt="..." fetchPriority="high" loading="eager" decoding="async" />
</picture>
```

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `<picture>` avec source WebP et fallback pour les images critiques

### Preload des images critiques

**A faire dans memes-by-lafouch :**
- [ ] Precharger l'image hero des pages meme dans `head()`
- [ ] Appliquer `priority` aux 4 premiers memes visibles dans les listes

### Format WebP

**A faire dans memes-by-lafouch :**
- [ ] S'assurer que Bunny CDN sert les thumbnails en WebP
- [ ] Generer des OG images en PNG 1200x630

---

## 4. Stripe — CRITICAL

### Payment Elements (pas Checkout redirect)

**Reference** — Stripe 20.x avec Payment Elements :
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: courtData.price,
  currency: 'eur',
  payment_method_types: ['card'],
  receipt_email: context.session.user.email,
  metadata: { courtId, userId: context.session.user.id }
})
return { clientSecret: paymentIntent.client_secret }
```

**Points cles :**
- `redirect: 'if_required'` dans `confirmPayment`
- Polling post-paiement (1s interval, 30s timeout) au lieu de redirect vers success page

**A faire dans memes-by-lafouch :**
- [ ] Comparer le flow de paiement actuel avec le pattern Payment Elements
- [ ] Implementer le polling post-paiement pour meilleur UX

### Webhook avec verification de signature

**Reference :**
```typescript
const signature = request.headers.get('stripe-signature')
if (!signature) {
  return new Response('Invalid request', { status: 400 })
}
const event = stripe.webhooks.constructEvent(rawBody, signature, serverEnv.STRIPE_WEBHOOK_SECRET)
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier que le webhook Stripe utilise `constructEvent` avec signature

### Idempotence des webhooks

**Reference** — double protection : verification en DB avant insertion + UNIQUE constraint avec `onConflictDoNothing`.

**A faire dans memes-by-lafouch :**
- [ ] Ajouter une colonne UNIQUE sur le payment ID dans les tables concernees
- [ ] Implementer la verification d'idempotence dans les handlers webhook

### Auto-refund et validation de prix

**A faire dans memes-by-lafouch :**
- [ ] Implementer un helper `safeRefund` avec gestion du `charge_already_refunded`
- [ ] Auto-refund sur echec de validation post-paiement
- [ ] Verifier le montant paye vs prix attendu dans les webhooks Stripe

### Env vars Stripe validees

**A faire dans memes-by-lafouch :**
- [ ] Ajouter des validations `startsWith` sur les cles Stripe dans env.ts (`sk_`, `whsec_`, `pk_`)

---

## 5. Auth et Middleware — CRITICAL

### Middleware composable et type-safe

**Reference** — pattern middleware chainable :
```typescript
export const authUserRequiredMiddleware = createMiddleware({ type: 'function' })
  .server(async ({ next }) => {
    const session = await auth.api.getSession({ headers: getRequest().headers })
    if (!session) {
      setResponseStatus(401)
      throw new StudioError('unauthorized', { code: 'UNAUTHORIZED' })
    }
    return next({ context: { user: session.user } })
  })

export const adminRequiredMiddleware = createMiddleware({ type: 'function' })
  .middleware([authUserRequiredMiddleware])
  .server(async ({ context, next }) => {
    if (context.user.role !== 'admin') {
      setResponseStatus(401)
      throw new StudioError('unauthorized', { code: 'UNAUTHORIZED' })
    }
    return next({ context: { user: context.user } })
  })
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier que le pattern middleware est utilise partout (pas de verification manuelle dans les handlers)
- [ ] S'assurer que `adminRequiredMiddleware` chaine `authUserRequiredMiddleware`
- [ ] Utiliser `setResponseStatus()` avant de throw les erreurs auth

### Route guards avec beforeLoad

**A faire dans memes-by-lafouch :**
- [ ] Verifier que toutes les routes protegees utilisent `beforeLoad` (pas de check dans le composant)

### Session cookie cache

**Reference :**
```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60
  }
}
```

**A faire dans memes-by-lafouch :**
- [ ] Activer `cookieCache` dans la config Better Auth (evite de refetch la session a chaque requete)

---

## 6. Server Functions — HIGH

### Pattern createServerFn

**Principes :**
1. Toujours specifier `method: 'GET'` ou `'POST'`
2. Toujours valider les inputs avec `.inputValidator()` + Zod
3. Imports dynamiques pour eviter le bundling client

**A faire dans memes-by-lafouch :**
- [ ] Verifier que toutes les server functions ont un `.inputValidator()` avec Zod
- [ ] Specifier le `method` explicitement sur chaque `createServerFn`
- [ ] Utiliser des imports dynamiques pour les modules lourds server-only

---

## 7. Route Loaders — HIGH

### Pattern loader avec ensureQueryData

**Reference :**
```typescript
export const Route = createFileRoute('/')({
  validateSearch: (search) => homeSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ context: { queryClient }, deps: { q } }) => {
    await Promise.all([
      queryClient.ensureQueryData(queryA(q)),
      queryClient.ensureQueryData(queryB())
    ])
  }
})
```

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `ensureQueryData` au lieu de `fetchQuery` dans les loaders
- [ ] Paralleliser les prefetch avec `Promise.all()`
- [ ] Ajouter `validateSearch` avec Zod sur les routes avec search params
- [ ] Ajouter `loaderDeps` pour les loaders qui dependent de search params

### Pattern head() pour le SEO

**A faire dans memes-by-lafouch :**
- [ ] Chaque route publique doit avoir un `head()` avec SEO complet
- [ ] Les pages 404 doivent avoir `noindex,nofollow`

---

## 8. Security Headers + Env Vars — HIGH

### Security Headers (Nitro routeRules)

**Reference :**
```typescript
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

> Voir aussi `security.md` pour les headers additionnels (CSP, HSTS).

**A faire dans memes-by-lafouch :**
- [ ] Ajouter ces headers via `routeRules` dans vite.config.ts

### Env vars avec validation stricte

**Reference** — separation client/server avec `@t3-oss/env-core` :
```typescript
// src/env/client.ts
export const clientEnv = createEnv({
  clientPrefix: 'VITE_',
  client: { VITE_SITE_URL: z.url() },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true
})

// src/env/server.ts
export const serverEnv = createEnv({
  server: {
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_')
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true
})
```

**A faire dans memes-by-lafouch :**
- [ ] Separer clairement client env et server env dans des fichiers distincts
- [ ] Ajouter des validations `.startsWith()` pour les cles API
- [ ] `emptyStringAsUndefined: true`

### Zod 4 avec locale FR

**A faire dans memes-by-lafouch :**
- [ ] Configurer la locale francaise Zod : `z.config(fr())`
- [ ] Les messages d'erreur de validation seront automatiquement en francais

---

## 9. Database / Drizzle — HIGH

> Ces patterns sont pertinents pour la future migration Prisma → Drizzle.

### Transactions serializables

**Reference** — isolation `serializable` pour eviter les race conditions :
```typescript
const result = await db.transaction(
  async (tx) => {
    const [existing] = await tx.select({ id: booking.id })
      .from(booking)
      .where(and(eq(booking.courtId, courtId), eq(booking.status, 'confirmed')))
      .limit(1)

    if (existing) {
      return { success: false, reason: 'slot_conflict' }
    }

    const [created] = await tx.insert(booking).values({ ... }).returning()
    return { success: true, bookingId: created.id }
  },
  { isolationLevel: 'serializable' }
)
```

**A faire dans memes-by-lafouch :**
- [ ] Utiliser des transactions pour les operations critiques (toggle bookmark avec count, etc.)

### Schema design patterns

Conventions a adopter pour la migration Drizzle :
- Tables en pluriel, colonnes en `snake_case`
- Timestamps avec suffixe `_at`, booleans avec prefixe `is_`
- Prix en centimes (integer, pas float), UUIDs partout
- `ON DELETE CASCADE` pour auth, `NO ACTION` pour donnees business
- Champ `is_anonymized` pour GDPR (soft delete)

**A faire dans memes-by-lafouch :**
- [ ] Adopter ces conventions pour la migration Drizzle
- [ ] Ajouter `is_anonymized` au modele User pour la suppression GDPR

---

## 10. Accessibilite — MEDIUM

### Skip to main content

**A faire dans memes-by-lafouch :**
- [ ] Ajouter un lien "Aller au contenu principal" dans le layout root
- [ ] Utiliser `<main id="main-content">` comme conteneur principal

### Semantic HTML

**A faire dans memes-by-lafouch :**
- [ ] Verifier l'usage de balises semantiques dans les layouts
- [ ] S'assurer que les headings suivent une hierarchie correcte (h1 → h2 → h3)

### Reduced motion

**A faire dans memes-by-lafouch :**
- [ ] Respecter `prefers-reduced-motion` dans les animations Motion
- [ ] Ajouter des fallbacks CSS pour reduced motion

### ARIA

**A faire dans memes-by-lafouch :**
- [ ] Ajouter `aria-label` sur les boutons sans texte visible
- [ ] `aria-hidden="true"` sur les icones decoratives
- [ ] `aria-live="polite"` pour les messages de statut dynamiques

---

## 11. Performance — MEDIUM

### Debounced search

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `useDebouncedValue` de `@tanstack/react-pacer` pour la recherche

### placeholderData pour les transitions

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `placeholderData: keepPreviousData` sur les queries avec filtres/pagination

### SSR Query Integration

**A faire dans memes-by-lafouch :**
- [ ] Verifier que `setupRouterSsrQueryIntegration` est configure

### useSyncExternalStore pour media queries

**Reference :**
```typescript
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
function getServerSnapshot() {
  return false
}
```

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `useSyncExternalStore` pour les hooks media query (SSR-safe)

---

## 12. DX — MEDIUM

### Husky pre-commit

**A faire dans memes-by-lafouch :**
- [ ] Ajouter Husky avec pre-commit `npm run lint` (bloque les commits avec erreurs TS/ESLint)

### Script deps avec taze

**A faire dans memes-by-lafouch :**
- [ ] Ajouter les scripts `deps` et `deps:major` dans package.json

### .npmrc strict

**A faire dans memes-by-lafouch :**
- [ ] Verifier/creer `.npmrc` avec `engine-strict=true`, `legacy-peer-deps=false`, `package-lock=true`

---

## 13. Fonts — LOW

**A faire dans memes-by-lafouch :**
- [ ] Evaluer l'auto-hebergement des Google Fonts (→ voir aussi `gdpr.md`)
- [ ] Utiliser `font-display: swap` si web fonts chargees
- [ ] Precharger les fonts critiques avec `<link rel="preload" as="font" type="font/woff2" crossorigin>`

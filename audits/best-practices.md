# Audit — Best Practices (depuis estcequecestlasaison)

> Learnings extraits du projet **estcequecestlasaison.fr** — considere comme reference pour les bonnes pratiques SEO, performance, caching, images, securite et accessibilite.

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
- [ ] `retry: false` par defaut (evite les retries silencieux)
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
```

Avec :
```typescript
const IMMUTABLE_CACHE = {
  'Cache-Control': 'public, max-age=31536000, immutable'
}
```

**A faire dans memes-by-lafouch :**
- [ ] Ajouter `routeRules` dans la config Nitro (vite.config.ts)
- [ ] Cache immutable (1 an) pour `/images/**` et `/fonts/**`
- [ ] Headers de securite sur toutes les routes (`/**`)

---

## 2. SEO — CRITICAL

### Helper SEO structure

**Reference** (`lib/seo.ts`) — fonction `seo()` qui retourne `{ meta, links }` :
```typescript
function seo({ title, description, keywords, image, imageAlt, pathname, ogType }: SeoParams) {
  return {
    meta: [
      { title: `${title} | ${SITE_NAME}` },
      // Open Graph
      { property: 'og:type', content: ogType },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: fullTitle },
      { property: 'og:url', content: url },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:image', content: ogImage },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: ogImageAlt },
      // Twitter Cards
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:image', content: ogImage },
      { name: 'twitter:image:alt', content: ogImageAlt },
      // Description + Keywords (conditionnels)
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', hrefLang: 'fr', href: url }
    ]
  }
}
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier que le helper SEO existant couvre tous ces champs (og:image dimensions, og:locale, twitter:image:alt)
- [ ] Ajouter `canonical` et `alternate` hrefLang sur chaque route
- [ ] S'assurer que chaque route a un `head()` avec SEO complet

### Root route meta tags

**Reference** (`__root.tsx`) :
```typescript
meta: [
  { charSet: 'utf-8' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
  { name: 'theme-color', content: '#10b981' },
  { name: 'color-scheme', content: 'light' },
  { name: 'robots', content: 'index,follow,noai,noimageai' },
  { name: 'application-name', content: SITE_NAME },
  { name: 'apple-mobile-web-app-title', content: SITE_NAME },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
  { name: 'mobile-web-app-capable', content: 'yes' },
  { name: 'format-detection', content: 'telephone=no' },
  { name: 'author', content: SITE_DOMAIN },
  { name: 'copyright', content: SITE_DOMAIN }
]
```

**A faire dans memes-by-lafouch :**
- [ ] Ajouter `noai,noimageai` au robots meta (bloquer les crawlers IA)
- [ ] Ajouter `viewport-fit=cover` pour les ecrans encoche
- [ ] Ajouter `color-scheme`, `application-name`, `apple-mobile-web-app-*`, `format-detection`
- [ ] Verifier la presence de `theme-color`

### Structured Data (JSON-LD)

**Reference** — schemas utilises :
- `WebSite` avec `SearchAction` (global, dans `__root.tsx`)
- `FAQPage` (page FAQ + pages produit)
- `BreadcrumbList` (navigation fil d'ariane)
- `Thing` / `ItemList` (pages produit, calendrier)

**A faire dans memes-by-lafouch :**
- [ ] Ajouter un schema `WebSite` global avec `SearchAction`
- [ ] Ajouter `BreadcrumbList` sur les pages avec navigation hierarchique
- [ ] Ajouter des schemas pertinents par page (VideoObject pour les memes video, etc.)
- [ ] Utiliser le package `schema-dts` pour le typage TypeScript des schemas

### Sitemap dynamique

**Reference** — route `sitemap[.]xml.ts` :
```typescript
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        // Generer le XML dynamiquement
        return new Response(sitemap, {
          headers: { 'Content-Type': 'application/xml' }
        })
      }
    }
  }
})
```

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
Sitemap: https://memesbylafouch.fr/sitemap.xml
```

Plus le meta tag `noai,noimageai` dans `__root.tsx`.

**A faire dans memes-by-lafouch :**
- [ ] Verifier/creer `robots.txt` avec lien vers sitemap
- [ ] Ajouter `noai,noimageai` dans les meta robots

### Web Manifest

**Reference :**
```json
{
  "name": "...",
  "short_name": "...",
  "description": "...",
  "start_url": "/",
  "lang": "fr",
  "icons": [...],
  "theme_color": "...",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier/completer `site.webmanifest` (icons, theme_color, lang)
- [ ] Lien `<link rel="manifest">` dans `__root.tsx`

---

## 3. Images — HIGH

### Composant image optimise

**Reference** (`produce-image.tsx`) :
```typescript
<img
  src={getProduceImageSrc(slug)}
  srcSet={getProduceImageSrcSet(slug)}
  sizes={sizes}
  alt={alt}
  width={256}
  height={256}
  loading={loading}           // lazy par defaut, eager pour above-the-fold
  fetchPriority={fetchPriority} // high pour les images critiques
  decoding={fetchPriority === 'high' ? 'sync' : 'async'}
  className="size-full object-cover"
/>
```

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
- [ ] `decoding="async"` par defaut

### Preload des images critiques

**Reference** — dans `head()` des routes :
```typescript
links: [
  {
    rel: 'preload',
    as: 'image',
    type: 'image/webp',
    href: `/images/produce/${slug}-512w.webp`
  }
]
```

**A faire dans memes-by-lafouch :**
- [ ] Precharger l'image hero des pages meme dans `head()`
- [ ] Precharger le background hero de la homepage (si applicable)
- [ ] Utiliser `media` pour conditionner le preload au viewport

### Priority loading pattern

**Reference** — les N premiers items d'un carousel :
```typescript
const PRIORITY_COUNT = 4

{produceList.map((produce, index) => (
  <Card priority={index < PRIORITY_COUNT} />
))}
```

**A faire dans memes-by-lafouch :**
- [ ] Appliquer `priority` aux 4 premiers memes visibles dans les listes
- [ ] Lazy-loader le reste

### Format WebP

**Reference** — toutes les images en WebP, qualite 80, generees via Sharp.

**A faire dans memes-by-lafouch :**
- [ ] S'assurer que Bunny CDN sert les thumbnails en WebP
- [ ] Generer des OG images en PNG 1200x630 pour chaque meme (ou via Bunny CDN transform)

---

## 4. Security Headers — HIGH

**Reference** (via Nitro routeRules) :
```typescript
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

**A faire dans memes-by-lafouch :**
- [ ] Ajouter ces headers via `routeRules` dans vite.config.ts
- [ ] Completer avec CSP et HSTS (deja prevu dans l'audit securite)

---

## 5. Server Functions — HIGH

### Pattern createServerFn

**Reference :**
```typescript
export const getSlugPageData = createServerFn({ method: 'GET' })
  .inputValidator(slugInputSchema)
  .handler(async ({ data }) => {
    const { getProductBySlug } = await import('@estcequecestlasaison/shared/services')
    return getProductBySlug({ slug: data.slug })
  })
```

**Principes :**
1. Toujours specifier `method: 'GET'` ou `'POST'`
2. Toujours valider les inputs avec `.inputValidator()` + Zod
3. Imports dynamiques pour eviter le bundling client
4. Fonctions fines — validation + delegation

**A faire dans memes-by-lafouch :**
- [ ] Verifier que toutes les server functions ont un `.inputValidator()` avec Zod
- [ ] Specifier le `method` explicitement sur chaque `createServerFn`
- [ ] Utiliser des imports dynamiques pour les modules lourds server-only

### Query Options Factory

**Reference** (`constants/queries.ts`) :
```typescript
export function groupedProduceOptions({ searchQuery, category, month }: Params) {
  return queryOptions({
    queryKey: ['grouped-produce', searchQuery, category, month],
    queryFn: () => getGroupedProduceData({ data: { searchQuery, category, month } })
  })
}
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier que toutes les query options sont dans `constants/queries.ts`
- [ ] Pattern `queryOptions()` avec `queryKey` incluant tous les parametres
- [ ] Reutiliser les memes options dans loader + composant

---

## 6. Route Loaders — HIGH

### Pattern loader avec ensureQueryData

**Reference :**
```typescript
export const Route = createFileRoute('/')({
  validateSearch: (search) => homeSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ context: { queryClient }, deps: { q } }) => {
    await Promise.all([
      queryClient.ensureQueryData(groupedProduceOptions({ ... })),
      queryClient.ensureQueryData(monthStatsOptions(month))
    ])
  }
})
```

**Principes :**
1. `validateSearch` avec Zod pour les search params
2. `loaderDeps` pour tracker les dependances du loader
3. `queryClient.ensureQueryData()` — ne refetch pas si deja en cache
4. `Promise.all()` pour paralleliser les prefetch
5. `throw notFound()` pour les 404

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `ensureQueryData` au lieu de `fetchQuery` dans les loaders (evite les refetch inutiles)
- [ ] Paralleliser les prefetch avec `Promise.all()` dans les loaders
- [ ] Ajouter `validateSearch` avec Zod sur les routes avec search params
- [ ] Ajouter `loaderDeps` pour les loaders qui dependent de search params

### Pattern head() pour le SEO

**Reference :**
```typescript
export const Route = createFileRoute('/$slug')({
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ name: 'robots', content: 'noindex,nofollow' }] }
    }
    return produceSeo({ produce: loaderData.produce, month: loaderData.currentMonth })
  },
  notFoundComponent: NotFound
})
```

**A faire dans memes-by-lafouch :**
- [ ] Chaque route publique doit avoir un `head()` avec SEO complet
- [ ] Les pages 404 doivent avoir `noindex,nofollow`
- [ ] Preloader les images critiques via `head().links`

---

## 7. Accessibilite — MEDIUM

### Skip to main content

**Reference :**
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100"
>
  Aller au contenu principal
</a>

<main id="main-content">...</main>
```

**A faire dans memes-by-lafouch :**
- [ ] Ajouter un lien "Aller au contenu principal" dans le layout root
- [ ] Utiliser `<main id="main-content">` comme conteneur principal

### Semantic HTML

**Reference** — utilisation correcte de `<main>`, `<nav>`, `<aside>`, `<article>`, `<section>`.

**A faire dans memes-by-lafouch :**
- [ ] Verifier l'usage de balises semantiques dans les layouts
- [ ] S'assurer que les headings suivent une hierarchie correcte (h1 → h2 → h3)

### Reduced motion

**Reference :**
```typescript
const isReducedMotion = useReducedMotion()

<motion.div
  whileHover={isReducedMotion ? undefined : 'hover'}
/>
```

```css
@media (prefers-reduced-motion: reduce) {
  .animated { transition: none; }
}
```

**A faire dans memes-by-lafouch :**
- [ ] Respecter `prefers-reduced-motion` dans les animations Motion
- [ ] Ajouter des fallbacks CSS pour reduced motion

### ARIA

**Reference :**
```tsx
<button aria-label="Rechercher (Ctrl+K)" aria-expanded={isOpen}>
  <Search aria-hidden="true" />
</button>

<div role="status" aria-live="polite" className="sr-only">
  {resultMessage}
</div>
```

**A faire dans memes-by-lafouch :**
- [ ] Ajouter `aria-label` sur les boutons sans texte visible
- [ ] `aria-hidden="true"` sur les icones decoratives
- [ ] `aria-live="polite"` pour les messages de statut dynamiques

---

## 8. Performance — MEDIUM

### Debounced search

**Reference :**
```typescript
const [debouncedSearch] = useDebouncedValue(searchQuery, { wait: 200 })
const suggestionsQuery = useQuery(searchSuggestionsOptions(debouncedSearch))
```

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `useDebouncedValue` de `@tanstack/react-pacer` pour la recherche
- [ ] Ne pas lancer de requete avant debounce

### placeholderData pour les transitions

**Reference :**
```typescript
const query = useQuery({
  ...groupedProduceOptions({ searchQuery, category, month }),
  placeholderData: keepPreviousData
})
```

**A faire dans memes-by-lafouch :**
- [ ] Utiliser `placeholderData: keepPreviousData` sur les queries avec filtres/pagination
- [ ] Evite le flash de contenu vide entre les changements de parametres

### SSR Query Integration

**Reference :**
```typescript
setupRouterSsrQueryIntegration({ router, queryClient })
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier que `setupRouterSsrQueryIntegration` est configure
- [ ] Les donnees prefetchees en SSR doivent hydrater le cache client

---

## 9. Environment Variables — MEDIUM

### Validation avec @t3-oss/env-core

**Reference :**
```typescript
import { createEnv } from '@t3-oss/env-core'

export const clientEnv = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SITE_URL: z.url()
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true
})
```

**A faire dans memes-by-lafouch :**
- [ ] Verifier que `src/constants/env.ts` valide toutes les variables avec Zod
- [ ] Separer client env et server env clairement
- [ ] `emptyStringAsUndefined: true` pour eviter les strings vides

---

## 10. Fonts — LOW

### System fonts

**Reference** — pas de chargement de web fonts en production. Utilise la stack systeme avec Inter en premier (fallback).

**A faire dans memes-by-lafouch :**
- [ ] Evaluer l'auto-hebergement des Google Fonts (deja prevu dans l'audit GDPR)
- [ ] Utiliser `font-display: swap` si web fonts chargees
- [ ] Precharger les fonts critiques

---

## Resume

| Categorie | Priorite | Items |
|-----------|----------|-------|
| Caching (QueryClient + Router + HTTP) | CRITICAL | 14 |
| SEO (meta, JSON-LD, sitemap, robots) | CRITICAL | 13 |
| Images (srcSet, sizes, preload, WebP) | HIGH | 8 |
| Security Headers (Nitro routeRules) | HIGH | 2 |
| Server Functions (validation, method) | HIGH | 3 |
| Route Loaders (ensureQueryData, head) | HIGH | 6 |
| Accessibilite (skip-link, ARIA, motion) | MEDIUM | 7 |
| Performance (debounce, placeholder) | MEDIUM | 4 |
| Environment Variables | MEDIUM | 3 |
| Fonts | LOW | 3 |
| **Total** | | **63** |

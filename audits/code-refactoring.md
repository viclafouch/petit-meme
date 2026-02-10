# Audit — Code Refactoring

| Sévérité | Nombre |
|----------|--------|
| HIGH | 24 |
| MEDIUM | 26 |
| LOW | 7 |
| **Total** | **57** |

---

## Bug logique / Code mort

### #46 — HIGH — Condition inatteignable dans `merge-ref.ts`

**Fichier :** `src/utils/merge-ref.ts:10-15`

```tsx
if (!filteredRefs.length) {
  return null
}

if (filteredRefs.length === 0) {   // <-- JAMAIS atteint
  return filteredRefs[0] as React.Ref<T>
}
```

La deuxième condition (`=== 0`) ne peut jamais être vraie car la première (`!filteredRefs.length`) couvre déjà `length === 0`. Bug probable : devrait être `=== 1`.

**Fix :** Changer en `filteredRefs.length === 1`.

---

### #47 — MEDIUM — Erreur détaillée avalée dans `utils.ts`

**Fichier :** `src/lib/utils.ts:23-31`

```tsx
try {
  const error = await response.json()
  throw new Error(`Fetch failed with status ${response.status}: ${error.message}`)
} catch (error) {
  throw new Error(`Fetch failed with status ${response.status}`)
}
```

Le `catch` avale l'erreur détaillée du `try`. Le message enrichi n'est jamais surfacé.

**Fix :** Re-throw l'erreur originale du try, fallback sur le message générique seulement si `response.json()` échoue.

---

## Ternaire conditionnel `&&` et ternaires imbriqués

### #21 — HIGH — Ternaire imbriqué dans `studio-dialog.tsx`

**Fichier :** `src/components/Meme/studio-dialog.tsx:177-256`

```tsx
{isLoading ? (
  <div>...</div>
) : data ? (
  <VideoPlayer>...</VideoPlayer>
) : (
  <VideoPlayer>...</VideoPlayer>
)}
```

3 niveaux de ternaire. Doit utiliser `if/else` extrait dans une fonction helper.

---

## Fonctions / composants > 30 lignes

Les composants/fonctions suivants dépassent largement la limite de 30 lignes :

| Fichier | Composant/Fonction | Lignes | Sévérité |
|---------|--------------------|--------|----------|
| `src/routes/admin/library/-components/meme-form.tsx` | `MemeForm` | ~378 | HIGH |
| `src/routes/_public__root/_default/memes/$memeId.tsx` | `RouteComponent` | ~277 | HIGH |
| `src/components/User/auth-dialog.tsx` | `SignupForm` | ~220 | HIGH |
| `src/components/Meme/player-dialog.tsx` | `PlayerDialog` | ~210 | HIGH |
| `src/components/User/auth-dialog.tsx` | `LoginForm` | ~192 | HIGH |
| `src/components/Meme/meme-reels.tsx` | `MemeReels` | ~150 | HIGH |
| `src/routes/_public__root/-components/responsive.tsx` | `Responsive` | ~147 | HIGH |
| `src/components/Meme/meme-list-item.tsx` | `MemeListItem` | ~117 | HIGH |
| `src/hooks/use-register-meme-view.ts` | useEffect callback | ~100 | HIGH |
| `src/hooks/use-video-processor.ts` | `useVideoProcessor` | ~82 | HIGH |
| `src/server/admin.ts` | `editMeme` handler | ~71 | MEDIUM |
| `src/lib/seo.ts` | `buildPricingJsonLd` | ~62 | MEDIUM |
| `src/server/admin.ts` | `createMemeFromTwitterUrl` | ~60 | MEDIUM |
| `src/hooks/use-video-processor.ts` | `addTextToVideo` | ~56 | HIGH |
| `src/lib/seo.ts` | `buildCategoryJsonLd` | ~54 | MEDIUM |

**Fix général :** Extraire les champs de formulaire en sous-composants, la logique de mutation en hooks custom, les helpers purs en fonctions module-level.

---

## Max 2 paramètres positionnels

### #9 — HIGH — 4 paramètres dans `getTresholdMs`

**Fichier :** `src/hooks/use-register-meme-view.ts:21-26`

```tsx
const getTresholdMs = (video, ratio, minMs, maxMs) => { ... }
```

**Fix :** `getTresholdMs(video, { ratio, minMs, maxMs }: ThresholdParams)`

---

### #10 — HIGH — 3 paramètres dans `generatePaginationLinks`

**Fichier :** `src/utils/generate-pagination.tsx:5-8`

```tsx
export const generatePaginationLinks = (currentPage, totalPages, getLinkProps) => { ... }
```

**Fix :** Accepter un objet `GeneratePaginationLinksParams`.

---

## Nommage booléen (`is*`, `has*`, `should*`, `can*`)

### #15 — HIGH — `open` au lieu de `isOpen`

**Fichier :** `src/components/mobile-nav.tsx:24`

```tsx
const [open, setOpen] = React.useState(false)
```

**Fix :** Renommer en `isOpen` / `setIsOpen`.

---

### #16 — HIGH — Même pattern

**Fichier :** `src/components/user-dropdown.tsx:35`

Même violation. **Fix :** `isOpen` / `setIsOpen`.

---

### #17 — MEDIUM — Props inline au lieu d'un type nommé

**Fichier :** `src/components/Meme/meme-reels.tsx:16-31`

Le composant `Reel` a 6 props définies inline. Devrait utiliser `type ReelProps = { ... }`.

---

## Mutations (`let` → immutable)

### #37 — HIGH — `let publishedAt` avec réassignation

**Fichier :** `src/server/admin.ts:79`

```tsx
let { publishedAt } = meme
if (values.status === 'PUBLISHED' && meme.status !== 'PUBLISHED') {
  publishedAt = new Date()
} else if (values.status !== 'PUBLISHED') {
  publishedAt = null
}
```

**Fix :** Extraire une fonction `getPublishedAt(values, meme)` retournant la valeur.

---

### #38 — HIGH — `let padFilter` et `let yPosition`

**Fichier :** `src/hooks/use-video-processor.ts:73-79`

**Fix :** Extraire une fonction retournant `{ padFilter, yPosition }` basée sur `textPosition`.

---

### #42 — MEDIUM — `let viewerKey`

**Fichier :** `src/server/meme.ts:209`

```tsx
let viewerKey = getCookie('anonId')
if (!viewerKey) { viewerKey = crypto.randomUUID() }
```

**Fix :** `const viewerKey = getCookie('anonId') ?? crypto.randomUUID()`

---

### Autres mutations MEDIUM

| Fichier | Ligne | Variable |
|---------|-------|----------|
| `src/lib/seo.ts` | 130 | `let duration = 'PT'` |
| `src/hooks/use-video-processor.ts` | 29 | `let currentLine = ''` dans `wrapText` |
| `src/utils/generate-pagination.tsx` | 32 | `let startPage` |

---

## `as const` sans `satisfies`

### #43 — HIGH — `BUNNY_STATUS`

**Fichier :** `src/constants/bunny.ts:14`

`as const` sans `satisfies`. Pas de validation de type.

**Fix :** Ajouter `satisfies Record<string, number>`.

---

### #44 — HIGH — FAQ items avec `as FaqItem[]`

**Fichier :** `src/routes/_public__root/-components/faq.tsx:45`

Utilise `as FaqItem[]` (assertion) au lieu de `as const satisfies readonly FaqItem[]`.

---

### #45 — MEDIUM — `sizes` dans `meme-list-item.tsx`

**Fichier :** `src/components/Meme/meme-list-item.tsx:50`

`as const` sans `satisfies`.

---

## Commentaires inutiles

| Fichier | Ligne(s) | Commentaire | Sévérité |
|---------|----------|-------------|----------|
| `src/components/path-breadcrumbs.tsx` | 17, 26, 30 | "Don't render if any match is still pending", "Filter matches...", "Don't render breadcrumbs..." | HIGH |
| `src/server/meme.ts` | 102 | `// 1 month ago` (le nom de variable dit déjà "30 days") | MEDIUM |
| `src/hooks/use-register-meme-view.ts` | 80 | `// option: sentRef.current = false; // si tu veux retenter` — code commenté mort | MEDIUM |
| `src/lib/react-tweet.ts` | 33-34 | `// If too many rates limit, maybe try fallback...` — TODO non actionnable | LOW |
| `src/lib/seo.ts` | 152 | `// On utilise le même ID` | MEDIUM |
| `src/lib/seo.ts` | 337 | `unitCode: 'MON' // Indique un cycle mensuel` | LOW |

---

## `return () => {}` inutiles

### Dans les event handlers (pas des useEffect)

**Fichier :** `src/hooks/use-register-meme-view.ts:96-126`

`onTimeUpdate` retourne `() => {}` dans plusieurs branches. Les event handlers n'ont pas besoin de cleanup — seuls les callbacks `useEffect` le font.

**Fix :** Remplacer par `return`.

### Dans les useEffect sans cleanup nécessaire

| Fichier | Ligne |
|---------|-------|
| `src/hooks/use-register-meme-view.ts` | 57 |
| `src/components/Meme/meme-reels.tsx` | 65, 81 |
| `src/components/Meme/player-dialog.tsx` | 107 |
| `src/routes/_public__root/_default/memes/$memeId.tsx` | 131 |
| `src/lib/theme.tsx` | 85 |

**Fix :** Utiliser `return` ou `return undefined`.

---

## `@ts-ignore` / `@ts-expect-error`

| Fichier | Ligne | Problème | Sévérité |
|---------|-------|----------|----------|
| `src/hooks/use-video-processor.ts` | 105 | `@ts-ignore` → devrait être `@ts-expect-error` | MEDIUM |
| `src/server/user.ts` | 30-31, 68-69 | `@ts-expect-error` sans explication — type mismatch `context.user` vs `UserWithRole` à corriger | MEDIUM |
| `src/lib/bunny.ts` | 107 | `@ts-ignore` → devrait être `@ts-expect-error` ou fix du type | MEDIUM |

---

## Typo

### #51 — MEDIUM — `getTresholdMs` → `getThresholdMs`

**Fichier :** `src/hooks/use-register-meme-view.ts:21`

---

## Divers

### #56 — LOW — `Boolean()` redondant

**Fichier :** `src/hooks/use-register-meme-view.ts:60`

```tsx
if (Boolean(sentRef.current))   // sentRef.current est déjà boolean
```

**Fix :** `if (sentRef.current)`

---

### #50 — LOW — Code commenté mort

**Fichier :** `src/hooks/use-video-processor.ts:158`

```tsx
// await checkGeneration()
```

**Fix :** Supprimer.

---

## Top 10 priorités

1. **Bug logique** dans `merge-ref.ts` (#46) — condition `=== 0` inatteignable, probablement `=== 1`
2. **Erreur avalée** dans `utils.ts` (#47) — message détaillé perdu dans le catch
3. **Ternaire imbriqué** dans `studio-dialog.tsx` (#21) — extraire en if/else
4. **Composants > 200 lignes** — `MemeForm` (378), `$memeId` (277), `SignupForm` (220), `PlayerDialog` (210)
5. **4 paramètres positionnels** dans `getTresholdMs` (#9)
6. **Mutations `let`** dans `admin.ts` (#37) et `use-video-processor.ts` (#38)
7. **`as const` sans `satisfies`** sur `BUNNY_STATUS` (#43) et FAQ items (#44)
8. **Nommage booléen** `open` → `isOpen` dans `mobile-nav.tsx` et `user-dropdown.tsx`
9. **Commentaires inutiles** dans `path-breadcrumbs.tsx` (3 commentaires)
10. **Typo** `getTresholdMs` → `getThresholdMs`

# Audit — Tailwind CSS

**Version :** Tailwind v4.1.18
**Composition de classes :** `cn()` → `twMerge(clsx(...))` + `cva()`
**Thème :** Défini dans `src/styles.css` avec `@theme inline` (CSS custom properties pour couleurs, radius, font `--font-bricolage`), animations custom (`background-shine`, `ping`, `bounce-subtle`), utilitaire `@utility no-scrollbar`, override `.container`.

**Fichiers exclus :** `src/components/ui/`, `src/components/animate-ui/`

| Type | Nombre |
|------|--------|
| redundant (`w-X h-X` → `size-X`, `px-X py-X` → `p-X`, etc.) | 25 |
| hardcoded (couleurs gray/zinc/stone, `text-[13px]`, etc.) | 12 |
| dead-class (classes en conflit/overridden) | 4 |
| forbidden-hover (`hover:scale-*`, `group-hover:scale-*`) | 2 |
| spacing (`mt-*`/`mb-*` → `gap`) | 2 |

**Point positif :** le codebase utilise déjà bien les `data-*` attributes pour le styling basé sur l'état — 0 finding attribute-styling.

---

## Redundant — `w-X h-X` → `size-X` (25 occurrences)

Le pattern le plus fréquent. Remplacement systématique recommandé.

### `w-full h-full` → `size-full`

| Fichier | Ligne(s) |
|---------|----------|
| `src/components/Meme/meme-list-item.tsx` | 161, 167, 175 |
| `src/components/Meme/meme-reels.tsx` | 100 |
| `src/components/Meme/player-dialog.tsx` | 150, 155, 159 |
| `src/components/Meme/studio-dialog.tsx` | 176, 178, 179, 182, 193, 196, 215, 218 |
| `src/components/admin/meme-list-item.tsx` | 47, 52, 57, 71, 72 |
| `src/routes/_public__root/_default/memes/$memeId.tsx` | 178, 181 |
| `src/routes/_public__root/_default/checkout.success.tsx` | 60 |
| `src/routes/_public__root/-components/responsive.tsx` | 131, 134, 159, 162, 187, 190, 192 |
| `src/routes/admin/library/$memeId.tsx` | 129 |

### `w-N h-N` → `size-N`

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/Meme/meme-list-item.tsx` | 193 | `w-8 h-8 md:w-10 md:h-10` | `size-8 md:size-10` |
| `src/components/path-breadcrumbs.tsx` | 41 | `h-4 w-4` | `size-4` |
| `src/components/admin/admin-nav-button.tsx` | 31, 32 | `h-8 w-8` | `size-8` |
| `src/routes/_public__root/_default/pricing.tsx` | 78 | `h-5 w-5` | `size-5` |
| `src/routes/_public__root/_default/settings/-components/profile-header.tsx` | 20 | `h-24 w-24` | `size-24` |
| `src/routes/admin/library/-components/meme-form.tsx` | 279 | `w-3 h-3` | `size-3` |
| `src/routes/admin/categories/-components/category-form.tsx` | 240 | `w-3 h-3` | `size-3` |

### Autres shorthands

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/mobile-nav.tsx` | 60 | `px-6 py-6` | `p-6` |
| `src/components/Meme/meme-reels.tsx` | 86 | `right-0 left-0` | `inset-x-0` |
| `src/components/Meme/meme-reels.tsx` | 100 | `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full` | `inset-0` |
| `src/components/Meme/meme-list-item.tsx` | 193 | `aspect-square` + `size-8` | `size-8` (aspect-square redondant quand w=h) |

### Redundant container

| Fichier | Ligne | Avant | Après | Explication |
|---------|-------|-------|-------|-------------|
| `src/components/footer.tsx` | 6 | `container mx-auto px-4 py-6` | `container py-6` | `.container` inclut déjà `mx-auto` et `px-4` |

---

## Hardcoded — Couleurs et valeurs qui devraient utiliser les tokens du thème

### `text-gray-*` → `text-muted-foreground` / `text-foreground`

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/Meme/meme-list-item.tsx` | 209 | `text-gray-500` | `text-muted-foreground` |
| `src/components/admin/meme-list-item.tsx` | 86 | `text-gray-100` | `text-foreground` |
| `src/components/admin/meme-list-item.tsx` | 94, 100 | `text-gray-500` | `text-muted-foreground` |
| `src/routes/_public__root/-components/best-memes.tsx` | 35 | `text-gray-500` | `text-muted-foreground` |
| `src/routes/admin/library/$memeId.tsx` | 58 | `text-gray-500` | `text-muted-foreground` |

### `text-zinc-*` → tokens thème

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/routes/_public__root/_default/pricing.tsx` | 39 | `text-zinc-700 dark:text-zinc-300` | `text-foreground` |
| `src/routes/_public__root/_default/pricing.tsx` | 74 | `text-zinc-700 dark:text-zinc-300` | `text-foreground` |

### Autres couleurs hardcodées

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/admin/meme-list-item.tsx` | 72 | `bg-stone-700` | `bg-muted` |
| `src/routes/_public__root/_default/pricing.tsx` | 65 | `border-zinc-300` | `border-border` |
| `src/routes/_public__root/_default/pricing.tsx` | 67 | `bg-white` | `bg-background` |

### Twitter form — couleurs hardcodées multiples

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/Meme/MemeForm/twitter-form.tsx` | 125 | `text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100` | `text-muted-foreground hover:text-foreground` |
| `src/components/admin/download-from-twitter-form.tsx` | 125 | (identique) | `text-muted-foreground hover:text-foreground` |

### Valeur arbitraire

| Fichier | Ligne | Avant | Après | Note |
|---------|-------|-------|-------|------|
| `src/components/admin/meme-list-item.tsx` | 95, 100, 105 | `text-[13px]` | `text-xs` | 13px vs 12px — à décider si intentionnel |

---

## Dead-class — Classes en conflit

### `h-7 w-7` + `size-6` — conflit de taille

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/Meme/MemeForm/twitter-form.tsx` | 125 | `h-7 w-7 ... size-6` | `size-7` (intention probable) |
| `src/components/admin/download-from-twitter-form.tsx` | 125 | `h-7 w-7 ... size-6` | `size-7` |

`h-7 w-7` et `size-6` sont en conflit. `twMerge` résout à `size-6` (dernier), mais l'intention semble être `size-7`. L'un des deux est faux.

### `p-4 pt-6` — padding overridé

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/Meme/meme-reels.tsx` | 86 | `p-4 pt-6` | `px-4 pb-4 pt-6` |

`p-4` set tous les côtés, `pt-6` override le top. L'intention est plus claire avec `px-4 pb-4 pt-6`.

### `max-w-full` redondant avec `w-full`

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/categories/categories-list.tsx` | 13 | `w-full overflow-x-auto max-w-full` | `w-full overflow-x-auto` |

---

## Forbidden-hover — Effets de hover interdits

| Fichier | Ligne | Classe | Action |
|---------|-------|--------|--------|
| `src/components/not-found.tsx` | 8 | `hover:scale-110` | Supprimer |
| `src/components/Meme/meme-list-item.tsx` | 193 | `group-hover:scale-100`, `md:scale-0` | Remplacer par un mécanisme basé sur l'opacité uniquement |

Seuls `hover:bg-*`, `hover:text-*`, `hover:border-*` sont autorisés.

---

## Spacing — `mt-*`/`mb-*` → `gap`

| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `src/components/default-loading.tsx` | 10-17 | Parent flex-col + enfant `mt-2` | `gap-2` sur le parent, retirer `mt-2` |
| `src/components/admin/admin-nav-button.tsx` | 46 | `flex flex-col space-y-1` | `flex flex-col gap-1` |

---

## Bouton hardcodé dans not-found.tsx

**Fichier :** `src/components/not-found.tsx:18`

Un bouton entièrement réécrit manuellement avec `bg-gray-900`, `text-gray-50`, `dark:bg-gray-50`, `dark:text-gray-900`, etc. Le projet a déjà `buttonVariants`.

**Fix :** Remplacer par `buttonVariants({ variant: 'default', size: 'default' })`.

---

## Recommandations principales

1. **Bulk replace `w-full h-full` → `size-full`** : ~20 emplacements, changement mécanique sans risque
2. **Remplacer toutes les couleurs hardcodées gray/zinc/stone** par les tokens thème (`text-muted-foreground`, `text-foreground`, `bg-muted`, `border-border`, `bg-background`)
3. **Résoudre le conflit `h-7 w-7` + `size-6`** dans twitter-form et download-from-twitter-form
4. **Supprimer les hover:scale interdits** et les remplacer par des transitions d'opacité
5. **Adopter `size-N` universellement** pour tous les `w-N h-N` sur les icônes

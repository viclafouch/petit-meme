# Audit — Dead Code

| Type | Nombre |
|------|--------|
| Packages npm inutilisés | 5 (+1 doublon) |
| Fichiers inutilisés | 11 |
| Exports inutilisés | 10 |
| Code inatteignable | 1 |
| **Total** | **28** |

---

## Packages npm inutilisés

Tous en confiance HIGH sauf mention contraire.

| Package | Raison | Action |
|---------|--------|--------|
| `@prisma/extension-accelerate` | Jamais importé. Le DB layer utilise `@prisma/adapter-pg` | `npm uninstall` |
| `@date-fns/tz` | Jamais importé. Le code utilise `date-fns` directement | `npm uninstall` |
| `@radix-ui/react-use-controllable-state` | Jamais importé dans `src/` | `npm uninstall` |
| `usehooks-ts` | Jamais importé dans `src/` | `npm uninstall` |
| `algoliasearch` | Le code importe `@algolia/client-search` (dépendance transitive). Aucun import direct de `algoliasearch` | `npm uninstall` puis ajouter `@algolia/client-search` explicitement |

### Doublon de package (MEDIUM)

| Packages | Détails | Action |
|----------|---------|--------|
| `motion` + `framer-motion` | 13 fichiers importent de `framer-motion`, 13 autres de `motion/react`. `motion` est le successeur qui ré-exporte `framer-motion` | Consolider vers un seul package |

### Vérifié comme utilisé (non-findings)

- `@prisma/client` : nécessaire comme runtime pour le client Prisma généré
- `@react-email/preview-server`, `react-email` : script `email:dev`
- `dotenv` : `prisma.config.ts`
- `vite-node` : scripts `crons:*`
- `husky` : script `prepare`
- `tailwindcss`, `tw-animate-css` : importés dans `src/styles.css`

---

## Fichiers inutilisés

Tous en confiance HIGH — jamais importés nulle part dans `src/`.

| Fichier | Exporte | Note |
|---------|---------|------|
| `src/components/ui/media.tsx` | (vide) | Fichier vide, 0 ligne de contenu |
| `src/components/ui/divider.tsx` | `Divider` | Jamais importé |
| `src/components/ui/progress.tsx` | `Progress` | La version animée `animate-ui/radix/progress.tsx` est utilisée à la place |
| `src/components/animate-ui/backgrounds/gradient.tsx` | `GradientBackground` | Jamais importé |
| `src/components/animate-ui/radix/sheet.tsx` | Sheet components | `ui/sheet.tsx` est utilisé à la place (par `sidebar.tsx`) |
| `src/components/animate-ui/radix/tabs.tsx` | Tabs components | `ui/tabs.tsx` est utilisé à la place |
| `src/components/animate-ui/text/highlight.tsx` | `HighlightText` | Jamais importé |
| `src/components/custom/animated-banner.tsx` | `AnimatedBanner` | Jamais importé |
| `src/components/motion-link.tsx` | `MotionLink` | Jamais importé |
| `src/constants/polar.ts` | `PRODUCT_ID` | Jamais importé — même valeur déjà hardcodée dans `PREMIUM_PLAN.productId` de `plan.ts` |
| `src/@types/meme.ts` | `MemeWithBoomarked` | Jamais importé (+ typo : "Boomarked" → "Bookmarked") |

---

## Exports inutilisés

Symboles exportés mais jamais importés en dehors de leur propre fichier.

| Fichier | Export | Utilisé localement ? | Action |
|---------|--------|---------------------|--------|
| `src/helpers/number.ts` | `FORMAT_OPTIONS_BY_LOCALE` | Oui (dans le même fichier) | Retirer `export` |
| `src/helpers/number.ts` | `formatEuros` | Oui (par `formatCentsToEuros`) | Retirer `export` |
| `src/helpers/number.ts` | `convertCentsToEuros` | Oui (par `formatCentsToEuros`) | Retirer `export` |
| `src/i18n/config.ts` | `SUPPORTED_LOCALES` | Oui (dérive le type `Locale`) | Retirer `export` |
| `src/utils/video.ts` | `matchIsVideoFullyReady` | Non | Supprimer la fonction |
| `src/lib/bunny.ts` | `VIDEO_PLAY_DATA_SCHEMA` | Oui (par `getVideoPlayData`) | Retirer `export` |
| `src/lib/seo.ts` | `appProdUrl` | Oui (dans le même fichier) | Retirer `export` |
| `src/constants/meme.ts` | `TWITTER_REGEX_THAT_INCLUDES_ID` | Oui (par `TWEET_LINK_SCHEMA`) | Retirer `export` |
| `src/stores/dialog.store.tsx` | `useCloseDialog` | Non | Supprimer la fonction |
| `src/lib/auth-client.ts` | `ERROR_CODES` | Oui (par `getErrorMessage`) | Retirer `export` |

---

## Code inatteignable

### `merge-ref.ts` — branche morte

**Fichier :** `src/utils/merge-ref.ts:10-16`

```tsx
if (!filteredRefs.length) {    // ligne 10 — couvre length === 0
  return null
}

if (filteredRefs.length === 0) {   // ligne 14 — JAMAIS atteint
  return filteredRefs[0] as React.Ref<T>
}
```

La condition `=== 0` est déjà couverte par `!filteredRefs.length`. Bug probable : devrait être `=== 1` (optimisation pour un seul ref).

**Fix :** Changer `filteredRefs.length === 0` en `filteredRefs.length === 1`.

---

## Résumé des actions

### Quick wins (impact immédiat, risque zéro)

1. **Supprimer 11 fichiers** inutilisés — aucun import nulle part
2. **Retirer `export`** de 8 symboles qui ne sont utilisés que localement
3. **Supprimer 2 fonctions** mortes (`matchIsVideoFullyReady`, `useCloseDialog`)
4. **Corriger le bug** dans `merge-ref.ts` (`=== 0` → `=== 1`)

### Nettoyage packages (faire un `npm run build` après)

5. **`npm uninstall`** : `@prisma/extension-accelerate`, `@date-fns/tz`, `@radix-ui/react-use-controllable-state`, `usehooks-ts`
6. **`npm uninstall algoliasearch`** puis ajouter `@algolia/client-search` explicitement
7. **Consolider** `motion` / `framer-motion` vers un seul package

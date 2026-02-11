# Audit — React Performance

| Priorité | Nombre |
|----------|--------|
| HIGH | 1 |
| MEDIUM | 8 |
| LOW | 7 |

**Zone critique :** la feature Reels (issues #1, #8, #9) concentre les problèmes les plus impactants.

**Points positifs déjà en place :** `React.memo` sur les list items, virtualisation des Reels, debounce sur la recherche, Zustand avec selectors, `React.lazy` pour les dialogs, pattern `Subscribe` de TanStack Form, `staleTime` configuré sur les queries principales.

---

## HIGH

### 1. `React.createRef` dans `useMemo` — nouvelles refs à chaque changement de données

**Fichier :** `src/components/Meme/meme-reels.tsx:203-218`

Le `useMemo` de `memesRefs` recalcule à chaque changement de `infiniteReels.data` (chaque nouvelle page). À chaque recalcul, `React.createRef()` est appelé pour **tous** les items, créant de nouvelles refs même pour les memes déjà existants. Conséquences :
- Le `useEffect` (ligne 233) déconnecte et reconnecte l'`IntersectionObserver` sur chaque élément
- Tous les composants `Reel` reçoivent de nouvelles refs, ce qui invalide `React.memo`

```tsx
const memesRefs = React.useMemo(() => {
  return (
    infiniteReels.data?.pages
      .flatMap(({ memes }) => memes)
      .map((meme, index) => ({
        data: meme,
        id: meme.id,
        ref: React.createRef<HTMLDivElement | null>(), // NOUVELLE ref à chaque recalcul
        index
      })) ?? []
  )
}, [infiniteReels.data])
```

**Fix suggéré :** Utiliser un `useRef` avec une `Map<string, RefObject>` pour persister les refs entre les recalculs, ne créer de nouvelles refs que pour les memes nouvellement ajoutés.

**Impact :** Thrashing du DOM observer et potentiels glitches de restart vidéo dans le scroll Reels. Issue la plus visible côté utilisateur.

---

## MEDIUM

### 2. ~~Dépendance `user` inutile dans `useMemo`~~ ✅ FAIT

`user` retiré des deps dans `meme-list-item.tsx` et `toggle-like-button.tsx`. `meme.id` ajouté. Prop `user` supprimée de `FavoriteItem` (devenue inutile).

---

### 3. ~~Même problème dans `toggle-like-button.tsx`~~ ✅ FAIT (voir #2)

---

### 4. Fonction inline `onOpenChange` recréée à chaque render pour `StudioDialog`

**Fichier :** `src/components/Meme/memes-list.tsx:113-116`

Une arrow function anonyme est créée inline à chaque render et passée à `StudioDialog` — un composant lourd (charge FFmpeg, render vidéo player).

```tsx
<StudioDialog
  meme={studioMemeSelected}
  open
  onOpenChange={() => { setStudioMemeSelected(null) }}
/>
```

**Fix :** Extraire en fonction nommée au scope du composant.

---

### 7. ~~`useLayoutEffect` avec dépendances vides~~ ✅ FAIT

`setTheme` ajouté aux dépendances dans `admin/route.tsx`.

---

### 8. `IntersectionObserver` créé comme valeur initiale de `useRef` (pas SSR-safe)

**Fichier :** `src/components/Meme/meme-reels.tsx:181-193`

L'`IntersectionObserver` est instancié pendant la phase de render (constructeur accède au DOM). Problèmes :
- Pas compatible SSR
- Capture `setActiveDebouncer` via closure du render initial → référence potentiellement stale

```tsx
const observerRef = React.useRef(
  new IntersectionObserver((entries) => { ... }, { threshold: 0.7 })
)
```

**Fix :** Initialiser le ref à `null`, créer l'observer dans un `useEffect`.

---

### 9. `virtualItems` comme dépendance de `useEffect` — se déclenche à chaque render

**Fichier :** `src/components/Meme/meme-reels.tsx:233-247`

`rowVirtualizer.getVirtualItems()` retourne une nouvelle référence d'array à chaque render. Utilisé comme dépendance du `useEffect` qui déconnecte/reconnecte l'`IntersectionObserver` → l'effet se déclenche à chaque render pendant le scroll.

**Fix :** Dériver une dépendance stable (nombre d'items virtuels ou sérialisation des indices).

---

### 10. Index utilisé comme `key` pour la liste de keywords

**Fichier :** `src/routes/admin/library/$memeId.tsx:80-86`

Les keywords sont rendus avec `index` comme `key`. Les keywords peuvent être réordonnés/ajoutés/supprimés dans le form d'édition → réconciliation DOM incorrecte.

**Fix :** Utiliser le keyword string comme key : `key={keyword}`.

---

### 16. ~~`useVideoInitializer` — cleanup avec dépendances vides~~ ✅ FAIT

`query.data` ajouté aux deps du cleanup FFmpeg.

---

### 17. ~~Même pattern de cleanup~~ ✅ FAIT

`ffmpeg` ajouté aux deps du cleanup.

---

### 18. `DialogProvider` souscrit à tout le store Zustand

**Fichier :** `src/stores/dialog.store.tsx:113-114`

`useDialog()` est appelé sans selector → souscription à tout le store. Comme `DialogProvider` wrappe toute l'app (`__root.tsx` ligne 81), tout changement du store notifie potentiellement l'arbre entier.

Impact limité grâce au pattern `children` prop, mais utiliser des selectors serait plus défensif.

**Fix :** `const component = useDialog(s => s.component)`, etc.

---

## LOW

### 5. `handleSelect` et `handleUnSelect` recréés à chaque render

**Fichier :** `src/components/Meme/memes-list.tsx:60-66`

Passés à chaque `MemeListItem` via `onPlayClick`. Comme `MemeListItem` est wrappé dans `React.memo`, les nouvelles références de fonctions invalident le memo → le `React.memo` est effectivement inutile.

**Impact :** Avec 12-24 items paginés, impact modéré. Soit stabiliser les callbacks, soit retirer le `React.memo` inutile.

---

### 6. `selectedMeme` calculé avec `.find()` à chaque render

**Fichier :** `src/components/Meme/memes-list.tsx:68-70`

`memes.find()` tourne à chaque render, même quand `selectedId` est null. Négligeable avec 12-24 items.

---

### 11. `Paginator` reçoit un `getLinkProps` instable

**Fichier :** `src/components/Meme/Filters/memes-pagination.tsx:19-42`

Callback recréé à chaque render. `Paginator` n'est pas memoized donc pas d'impact actuel.

---

### 12. `getCategoriesListQueryOpts` — `select` trie à chaque accès

**Fichier :** `src/lib/queries.ts:92-105`

`[...categories].sort(...)` crée une nouvelle référence d'array à chaque appel du selector. Impact mineur (liste de catégories petite).

**Fix :** Déplacer le tri dans le `queryFn` pour que le cache soit pré-trié.

---

### 13. `MemeForm` — filtre de catégories inline à chaque render

**Fichier :** `src/routes/admin/library/-components/meme-form.tsx:342-344`

`categoriesOptions.filter(...)` appelé inline dans le JSX.

**Fix :** Inclure le filtre `news` dans le `useMemo` de `categoriesOptions`.

---

### 14. `StarsBackground` régénère les positions des étoiles au mount

**Fichier :** `src/components/animate-ui/backgrounds/stars.tsx:41-45`

Coût unique d'initialisation (1000+ positions random). Acceptable.

---

### 15. `useVideoProcessor` retourne une fonction `reset` instable

**Fichier :** `src/hooks/use-video-processor.ts:209-212`

Nouvelle closure à chaque render. Hook utilisé uniquement dans `StudioDialog` monté conditionnellement. Impact négligeable.

---

### 19. ~~`return () => {}` inutiles~~ → déplacé vers `code-refactoring.md`

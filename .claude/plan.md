# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

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

## Studio — Refonte performance & UX

Refonte complète du Studio (overlay texte sur vidéo). Priorité : performance FFmpeg, responsive mobile, et UX améliorée.

**Stack actuelle** : `@ffmpeg/ffmpeg@0.12.15` + `@ffmpeg/core@0.12.9` (single-thread, WASM self-hosted dans `/public/ffmpeg/`).

### Phase 1 — Performance & stabilité

- [x] Self-host le WASM core dans `/public/ffmpeg/` (script `postinstall` + cache immutable)
- [x] Loading state WASM avec `useSuspenseQuery` + `React.Suspense` + `ErrorBoundary`
- [x] Cache blob vidéo source (`staleTime: Infinity`)
- [x] Cache font FS FFmpeg (persiste tant que l'instance vit)
- [x] Bouton Annuler (`ffmpeg.terminate()` + invalidation query)
- [x] Limite texte `maxLength={150}`
- [x] Timeout 30s sur `ffmpeg.load()` pour éviter spinner infini
- [x] Monitoring Sentry sur les `ErrorBoundary` Studio + `captureException` dans les hooks

### ~~Phase 2 — Multi-thread FFmpeg~~ ANNULÉ

Retiré : `crossOriginIsolated` / `SharedArrayBuffer` ne fonctionne pas de manière fiable sur iOS Safari (même avec COEP `credentialless`). Le single-thread reste la cible pour la compatibilité maximale. À réévaluer quand le support navigateur sera plus stable.

### Phase 3 — Page dédiée Studio + Responsive + Live Preview + Templates

Migration du Studio depuis un Dialog vers une page dédiée `/memes/:memeId/studio`. Layout éditeur deux colonnes (preview + contrôles), responsive mobile-first. Inclut la Phase 4 (preview live, templates, couleurs, taille).

- [x] Créer la route `/memes/$memeId/studio` sous layout `_studio` dédié (sans navbar/footer, full viewport)
- [x] SEO : `noindex, follow` + canonical vers `/memes/:memeId` (pas de duplicata)
- [x] Ajouter `noindex` et `canonicalPathname` à la fonction `seo()` dans `src/lib/seo.ts`
- [x] Créer les composants Studio : `studio-page.tsx`, `studio-preview.tsx`, `studio-controls.tsx`, `studio-actions.tsx`, `studio-live-overlay.tsx`, `studio-templates.tsx`
- [x] Layout desktop : preview (flex-1) + panneau contrôles (w-80/w-96) avec `md:flex-row`
- [x] Layout mobile : stacking vertical (vidéo pleine largeur + contrôles en dessous)
- [x] Bouton "Partager" prioritaire sur mobile (au-dessus de "Télécharger")
- [x] Preview live CSS : overlay DOM texte sur la vidéo (sans FFmpeg) — `studio-live-overlay.tsx`
- [x] Templates prédéfinis : "Légende" (Arial, bande blanche, texte noir), "Sous-titre" (fond semi-transparent noir, texte blanc)
- [x] Choix de la couleur du texte (pastilles : noir, blanc, rouge, bleu)
- [x] Choix de la taille du texte (presets : P/M/G → 24/36/48 px via ToggleGroup)
- [x] Choix de la police (Select — Arial par défaut, extensible Phase 5)
- [x] Constantes typées : `STUDIO_TEMPLATES`, `STUDIO_FONT_SIZES`, `STUDIO_COLORS`, `STUDIO_FONTS`, `StudioSettings`
- [x] Remplacer dialog par Link dans `$memeId.tsx`, `memes-list.tsx`, `player-dialog.tsx`, `meme-list-item.tsx`
- [x] Supprimer `studio-dialog.tsx`
- [x] Adapter `studio-fallbacks.tsx` au contexte page (plus de `fixed inset-0`)
- [x] Afficher 4 mèmes similaires dans le sidebar (comme la page slug) — navigation entre mèmes sans perdre les settings (texte, couleur, police, template)
- [ ] Tester le flow complet sur iOS Safari et Chrome Android
- [ ] Gérer le cas où `navigator.share()` n'est pas supporté (fallback download)

### Phase 3.5 — Refonte video player (Studio + PlayerDialog)

Simplification du player vidéo : suppression de la barre de contrôles, interactions directes sur la vidéo.

- [x] Créer `src/components/Meme/video-overlay.tsx` — composant réutilisable :
  - Clic = play/pause (via media-chrome dispatch)
  - Bouton fullscreen en bas-droite (au-dessus du mute)
  - Grande icône ▶ centrée quand en pause
  - Bouton mute/unmute en bas-droite (toujours visible, style Reels)
  - Badge temps restant en bas-gauche (PlayerDialog uniquement, isolé dans `RemainingTimeBadge` pour éviter les re-renders à chaque frame)
- [x] `studio-preview.tsx` : supprimer `VideoPlayerControlBar` de `OriginalVideo` et `ProcessedVideo`, ajouter `VideoOverlay`, ajouter `playsInline` sur `OriginalVideo`
- [x] `player-dialog.tsx` : supprimer `VideoPlayerControlBar`, ajouter `VideoOverlay` avec `showDuration`
- [ ] Tester sur iOS Safari (playsInline, pas d'autoplay inline)

### Phase 4 — Features avancées

- [x] Plusieurs fonts (Impact, Arial) dans `/public/fonts/`
- [x] Fond de bande configurable (choix de couleurs : blanc, noir, rouge, bleu — blanc par défaut)
- [x] Optimisation des paramètres FFmpeg d'encodage (codec explicite, pix_fmt yuv420p, stream mapping, single-thread explicite, strip metadata)
- [x] Cache `input.mp4` en WASM FS entre les générations (WeakMap par instance FFmpeg, skip writeFile si même mème)
- [x] Preload au focus input : `useVideoPreloader` expose `triggerPreload()`, déclenché au focus des inputs texte (mobile + desktop). Prefetch blob vidéo + font Arial + write WASM FS. Pas de preload au mount, pas de re-trigger auto au changement de mème.
- [x] FFmpeg : mode overlay (`drawbox` semi-transparent) quand `bandOpacity < 1`, mode caption (`pad`) quand `bandOpacity === 1`

### Phase 5 — Accessibilité WCAG 2.1 AA (Vidéo & Studio)

- [x] `PlayerDialog` : `role="dialog"`, `aria-modal`, `aria-labelledby`, `FocusScope` (focus trap), body scroll lock, focus restoration via `triggerRef`
- [x] `VideoOverlay` : `role="button"`, `tabIndex={0}`, `aria-label` dynamique (Lire/Pause), `onKeyDown` Enter/Space
- [x] `MemeReels` : `role="feed"` + `aria-label` sur scroll container, `role="article"` + `aria-posinset`/`aria-setsize` sur items
- [x] `StudioControls` : `id` sur Labels, `aria-labelledby` sur ToggleGroup/Select/ColorSwatches, `role="radiogroup"` + `role="radio"` + `aria-checked` sur ColorSwatches
- [x] Mini-previews visuelles pour les templates (thumbnail mème + bande colorée + texte "Abc" au lieu de cartes texte)
- [x] Color swatches : touch targets augmentés `size-7` → `size-10` (40px)
- [x] Font sizes : `accessibleLabel` dans `STUDIO_FONT_SIZES` + `aria-label` sur ToggleGroupItem
- [x] Studio mobile input : `aria-label="Texte à ajouter sur la vidéo"`
- [x] `LoadingButton` : `aria-busy={isLoading}`

---

## Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.).

Inclut la stratégie d'index Algolia bilingue (index unique avec champ `lang` vs deux index séparés).

---

## Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

---

## Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

---

## ~~Migration npm → pnpm~~ FAIT

- [x] `packageManager: pnpm@10.30.1` + corepack
- [x] `pnpm-lock.yaml` généré, `package-lock.json` et `.npmrc` supprimés
- [x] Scripts, hooks, docs et rules mis à jour
- [x] Note : mettre à jour la commande d'install sur Railway (`pnpm install` au lieu de `npm install`)

---

## Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : redirection www → apex (et supprimer le check manuel dans `server.ts`), CDN/cache, SSL, protection DDoS, Page Rules, etc.

---

## Sentry — Migration ErrorBoundary

Remplacer `react-error-boundary` par `Sentry.ErrorBoundary` dans toute l'app. Capture automatique des erreurs sans `onError` manuel.

- [ ] Remplacer tous les `<ErrorBoundary>` de `react-error-boundary` par `Sentry.ErrorBoundary`
- [ ] Supprimer les `onError={captureException}` devenus inutiles
- [ ] Évaluer si `react-error-boundary` peut être retiré des dépendances

---

## Dependabot — Vulnérabilités

Traiter les vulnérabilités signalées par GitHub : https://github.com/viclafouch/petit-meme/security/dependabot

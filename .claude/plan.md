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

**Stack actuelle** : `@ffmpeg/ffmpeg@0.12.15` + `@ffmpeg/core@0.12.9` (single-thread, WASM chargé depuis unpkg CDN ~36MB).

### Phase 1 — Performance & stabilité

**Fichiers impactés** : `use-video-processor.ts`, `studio-dialog.tsx`, `vite.config.ts`, `package.json`, `.gitignore`

**Workflow** : utiliser `/frontend-design` pour tout le travail UI (loading states, bouton annuler, layout). Utiliser les composants shadcn existants ou en installer de nouveaux si nécessaire (`pnpm dlx shadcn@latest add <component>`). Utiliser les MCP (chrome-devtools, context7) pour vérifier le rendu et consulter la doc.

- [x] Self-host le WASM core : installer `@ffmpeg/core@0.12.9` en dep + script `postinstall` copiant `ffmpeg-core.js`, `.wasm` vers `/public/ffmpeg/` (gitignored). Passer `coreURL`/`wasmURL` dans `ffmpeg.load()`. Ajouter route rule `/ffmpeg/**` avec headers immutable dans `vite.config.ts`
- [x] Loading state WASM : garder `useSuspenseQuery` dans `useVideoInitializer`. Wrapper `StudioDialog` dans `React.Suspense` avec fallback skeleton + spinner + "Chargement du moteur vidéo...". Ajouter un `ErrorBoundary` avec message d'erreur + bouton Retry. Chargement déclenché à l'ouverture du dialog
- [x] Cache blob vidéo source : créer une query TanStack `fetchVideoBlob(memeId)` avec `staleTime: Infinity`. Réutilisée entre les générations successives sans re-fetch Bunny CDN
- [x] Cache font FS FFmpeg : retirer le `ffmpeg.load()` redondant dans `onMutate`. Ne plus `deleteFile('arial.ttf')` après chaque génération — le font persiste tant que l'instance vit
- [x] Bouton Annuler : pendant le processing, afficher un bouton "Annuler" qui appelle `ffmpeg.terminate()` puis invalide la query `'video-processor-init'` pour recréer une instance
- [x] Limite texte : `maxLength={150}` sur l'`<Input>` (wrap à 50 chars → max 3 lignes dans la bande)
- [x] Fix TypeScript : remplacer le `@ts-expect-error` sur `readFile` par un type guard `if (data instanceof Uint8Array)`, sinon throw

### Phase 2 — Multi-thread FFmpeg

**Fichiers impactés** : `server.ts`, `use-video-processor.ts`, `studio.ts`, `studio-fallbacks.tsx`, `$memeId.tsx`, `memes-list.tsx`, `copy-ffmpeg.js`, `vite.config.ts`, `package.json`

- [x] Auditer les ressources cross-origin — confirmé : Bunny CDN, Algolia, Sentry, Stripe.js, Google Fonts. Pas d'iframes. Aucun blocage anticipé avec `credentialless`
- [x] Ajouter `Cross-Origin-Embedder-Policy: credentialless` dans `server.ts` — appliqué à toutes les pages (global). COOP `same-origin` déjà en place
- [x] Remplacer `@ffmpeg/core` par `@ffmpeg/core-mt` dans `package.json` (supprimer l'ancien)
- [x] Mettre à jour `scripts/copy-ffmpeg.js` : source `@ffmpeg/core-mt/dist/esm`, copier aussi `ffmpeg-core.worker.js`
- [x] Ajouter constante `FFMPEG_WORKER_URL` dans `src/constants/studio.ts`
- [x] Mettre à jour `use-video-processor.ts` : passer `workerURL` dans `ffmpeg.load()`, check `crossOriginIsolated` au début de `useVideoInitializer` (throw si false)
- [x] Remplacer `@ffmpeg/core` par `@ffmpeg/core-mt` dans `optimizeDeps.exclude` de `vite.config.ts`
- [x] Pas de fallback single-thread : si `crossOriginIsolated === false`, message d'erreur UX dans le dialog via `StudioErrorFallback` avec titre + causes + actions :
  - Titre : "Le Studio n'est pas disponible"
  - Cause 1 : "Votre navigateur est trop ancien → Mettez-le à jour"
  - Cause 2 : "Un bloqueur de publicités interfère → Désactivez-le sur ce site"
  - Cause 3 : "Vous êtes en navigation privée → Essayez en mode normal"
  - Bouton "Réessayer" (appelle `resetErrorBoundary`)
- [x] Monitoring Sentry : ajouter `onError={captureException}` sur les `<ErrorBoundary>` Studio dans `$memeId.tsx` et `memes-list.tsx` + `Sentry.captureException` explicites dans les hooks `useVideoInitializer` et `useVideoProcessor`
- [ ] Tester sur mobile (Safari iOS 15.2+, Chrome Android) — validation manuelle après deploy

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

### Phase 4 — Features avancées

- [ ] Plusieurs fonts (Impact, Arial, Comic Sans, etc.) dans `/public/fonts/`
- [ ] Texte directement sur la vidéo sans bande (outline/shadow pour lisibilité)
- [ ] Fond de bande configurable (couleur, transparence)
- [ ] Copy to clipboard (`navigator.clipboard.write()`)
- [ ] Export GIF en plus du MP4
- [ ] Historique des 5 dernières créations (IndexedDB)
- [ ] Texte multi-positions (N blocs de texte positionnables)
- [ ] Crop/trim de la vidéo avant ajout de texte

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

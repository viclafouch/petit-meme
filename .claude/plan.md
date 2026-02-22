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

- [ ] Auditer toutes les ressources cross-origin (Bunny CDN, Algolia, Sentry, Stripe, fonts Google, iframes)
- [ ] Ajouter `Cross-Origin-Embedder-Policy: credentialless` dans `server.ts` (alternative souple à `require-corp`)
- [ ] Installer `@ffmpeg/core-mt` et passer en multi-thread (~2x speedup)
- [ ] Tester sur mobile (Safari iOS supporte `SharedArrayBuffer` depuis iOS 15.2+)
- [ ] Fallback single-thread si `crossOriginIsolated === false`

### Phase 3 — Responsive & mobile-first

- [ ] Repenser le layout du dialog pour mobile (actuellement `grid-cols-[auto_350px]` → stacking vertical)
- [ ] Vidéo preview en pleine largeur sur mobile
- [ ] Contrôles (texte, position, boutons) en dessous de la preview sur mobile
- [ ] Bouton "Partager" prioritaire sur mobile (au-dessus de "Télécharger")
- [ ] Touch targets 44x44px minimum sur tous les boutons/inputs
- [ ] Tester le flow complet sur iOS Safari et Chrome Android
- [ ] Gérer le cas où `navigator.share()` n'est pas supporté (fallback download)

### Phase 4 — Preview live & templates

- [ ] Preview live CSS du texte (overlay DOM sur la vidéo, sans lancer FFmpeg)
- [ ] L'utilisateur voit le résultat en temps réel avant de lancer le processing
- [ ] Templates prédéfinis : "Classic meme" (Impact blanc, outline noir, haut+bas), "Caption" (Arial, bande blanche), "Subtitle" (blanc, fond semi-transparent, bas)
- [ ] Choix de la couleur du texte (pastilles : noir, blanc, rouge, bleu)
- [ ] Choix de la taille du texte (presets : petit, moyen, grand)

### Phase 5 — Features avancées

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

## Dependabot — Vulnérabilités

Traiter les vulnérabilités signalées par GitHub : https://github.com/viclafouch/petit-meme/security/dependabot

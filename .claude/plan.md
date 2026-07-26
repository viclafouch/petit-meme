# Migration takumi-js 1.8.7 → 2.5.0

Génération des images Open Graph (`src/routes/api/og.ts` + `src/components/og/`).

## Phase 1 — Rétro-compatibilité (terminée)

- [x] Bump `takumi-js` 1.8.7 → 2.5.0 (`@takumi-rs/core`, `helpers`, `wasm` suivent en 2.5.0)
- [x] Vérifier l'API `ImageResponse` : signature inchangée, `fonts` accepte toujours le descripteur `{ name, data: () => Promise<ArrayBuffer> }`. `createImageResponse` supprimé en v2 mais non utilisé ici.
- [x] Comparaison visuelle avant/après sur 4 scènes (home FR, page avec sous-titre, page sans sous-titre, débordement titre + sous-titre)
- [x] Conclusion : **aucune modification de template nécessaire**. Les changements de défauts v2 annoncés dans le guide (`object-position` et `transform-origin` top-left → center) ne touchent pas ce code : v1 centrait déjà sur ce chemin. Écart résiduel = anti-aliasing du rééchantillonnage d'images (0,14 % des pixels à 5 % de tolérance, 0,01 % à 15 %).
- [x] Tentative puis **retrait** de `objectPosition: '0 0'` / `transformOrigin: '0 0'` : mesurés comme des régressions (diff 37 608 px vs 26 291 px sans).
- [x] `line-clamp` (raccourci en v2) : troncature du sous-titre identique à v1 sur contenu débordant.
- [x] Correctif build : `exportConditions: ['!unwasm']` dans la config nitro (`vite.config.ts`)
- [x] Validation runtime dans le bundle Vercel tracé : PNG 200 / `image/png` / headers OK

### Le piège du build

Nitro active la condition `unwasm` sur tous les presets. En v2, `takumi-js` expose un champ `imports["#backend"]` qui liste `unwasm` **avant** `node`. Résultat sans correctif :

- au build, le tracer résout `#backend` → `dist/backend/wasm.mjs` et ne trace que `@takumi-rs/wasm` (sans même embarquer le binaire `.wasm`)
- au runtime, Node résout `#backend` → `dist/backend/node.mjs`, jamais tracé
- crash `ERR_MODULE_NOT_FOUND` sur `/api/og` en production

`exportConditions: ['!unwasm']` fait résoudre les deux côtés vers le backend natif, comme en v1. Vérifié : seuls `nitro` et les paquets `takumi` déclarent cette condition, la négation n'affecte aucune autre dépendance (Prisma passe par un `.wasm-base64.mjs`, pas par unwasm).

### Ce que la v2 corrige gratuitement

- La font était refetchée en HTTP à **chaque** render en v1 (`loadRendererResources` appelait `loadFonts` par appel). Le `FontRegistry` v2 déduplique par `name` et ne résout le loader qu'une fois par process.
- Un panic Rust tuait le process Node en v1 ; il remonte désormais en erreur JS attrapable (`title`/`subtitle` viennent de la query string, non authentifiés).
- Plafonds d'octets et timeout de 5 s appliqués aux fonts (images seulement en v1), limite de décodage 8192×8192.
- Le peer `react-dom` disparaît : `takumi-js` n'est plus résolu deux fois dans le lockfile.

## Phase 2 — Audit indépendant (2026-07-26)

Contre-audit de la liste issue de la phase 1. Chaque point ci-dessous a été **mesuré**, pas déduit. Le plan d'action est en attente de validation ; rien n'est encore codé.

### Mesures de référence

Harnais local : serveur HTTP statique éphémère sur `public/`, rendu des vrais templates via `tsx`, latence d'assets injectable pour simuler le trajet lambda → CDN.

| Scénario | Render à froid | Renders à chaud | Requêtes HTTP / 5 renders |
|---|---|---|---|
| home, latence 0 ms, sans cache | 54 ms | 14 / 13 / 12 / 12 ms | 36 |
| home, latence 0 ms, `fetchCache` | 52 ms | 9 / 9 / 9 / 9 ms | 8 |
| home, latence 30 ms, sans cache | 120 ms | 47 / 44 / 45 / 43 ms | 36 |
| home, latence 30 ms, `fetchCache` | 113 ms | **9 / 9 / 9 / 9 ms** | 8 |
| page, latence 30 ms, sans cache | 51 ms | 42 / 41 / 42 / 41 ms | 10 |
| page, latence 30 ms, `fetchCache` | 48 ms | **7 / 7 / 7 / 7 ms** | 1 |

Production (v1 encore déployée, UA navigateur, `x` unique pour forcer un MISS CDN) : home `total` 145–190 ms, page 115–120 ms, `x-vercel-cache: MISS` puis `HIT` au second appel. Le CDN Vercel cache donc bien la route ; le trafic légitime coûte une invocation par URL distincte.

### Corrections apportées au constat de phase 1

- **`fonts` n'est plus dans les types.** `ImageResponseOptions = RenderOptions & ResponseInit & { onError }`, et `RenderOptions` n'expose ni `fonts` ni `fontFamilies`. L'option est traitée à l'exécution par `prepareRenderInput` dans `@takumi-rs/helpers/renderer`, mais TypeScript ne la valide plus. Vérifié : `fonts` avec les octets d'Arial sous le nom `Bricolage Grotesque` rend de l'Arial, sans `fonts` du tout rend le Geist embarqué. **Une faute de frappe sur `fonts` dégraderait silencieusement le rendu.**
- **Le `FontRegistry` déduplique bien**, clé `"{name}:{weight}:{style}"` sur l'instance de `Renderer`, et `takumi-js` réutilise un `globalRenderer` module-level. La police est donc fetchée une fois par process. Confirmé.
- **Deux copies de React : faux positif.** `pnpm why react` ne renvoie que `19.2.8`. Les dossiers `takumi-js@1.8.7_react-dom@19.2.7…` sous `node_modules/.pnpm` sont des orphelins du store, pas des copies résolues.
- **Jeton de version dans l'URL : déjà implémenté.** `OG_VERSION = 1` dans `src/lib/seo.ts:42`, propagé en `&v=`. Il reste à documenter qu'il faut le bump lors d'une refonte de template.
- **Un firewall est déjà actif.** Un UA `curl` par défaut reçoit un 429 « Vercel Security Checkpoint » sur `/` comme sur `/api/og` : l'Attack Challenge Mode est activé au niveau du site.
- **`text-fit` est typé mais pas implémenté en 2.5.0.** `textFit: 'shrink'` en style inline et `text-fit: shrink` via `stylesheets` produisent tous deux un PNG **strictement identique** au rendu sans la propriété (même hash SHA-1, mêmes octets). Le `measure()` n'est donc pas la seule option, mais `text-fit` n'en est pas une.
- **`lineClamp: 2` + `textOverflow: 'ellipsis'` fonctionne sur le titre** (64 px, gras) : vérifié visuellement, troncature avec ellipse. Suffit à corriger le débordement sans passe de mesure.

### Constats absents du plan de phase 1

- **`prepareImages` a `throwOnError: true` par défaut.** Un seul asset qui échoue fait échouer tout le rendu. La home dépend aujourd'hui de 7 fetchs, soit 7 points de défaillance uniques **par render**.
- **Les 7 assets sont auto-hébergés mais fetchés en HTTPS depuis la lambda vers le CDN public.** Aller-retour réseau facturé dans les deux sens, à chaque render non caché.
- **La police de dernier recours a changé en 2.0.0** : `{Geist, Geist Mono, Manrope}` → un sous-ensemble latin de Geist qui ne revendique plus la famille générique `sans-serif`. Sans risque pour du latin, tofu garanti pour du CJK ou un emoji sans provider.
- **`Cache-Control` en double : à ne pas « corriger » naïvement.** C'est l'en-tête renvoyé par la fonction qui décide de la mise en cache CDN ; la route rule Vercel s'applique à l'arrivée. Supprimer la ligne du handler risque de désactiver le cache CDN, supprimer la route rule fait retomber `/api/og` sur `/**` qui pose `no-cache`. Les deux restent, seule la valeur doit être dédupliquée.

### Plan d'action réalisé

P0 :

- [x] `images: { fetchCache }` (Map module-level dans `og.ts`). Mesuré sur le bundle Vercel tracé, assets réels servis par le CDN de prod : home fr à froid **950 ms**, home en juste après **11 ms**, category ensuite **10 ms**. Les 7 assets et la police ne sont fetchés qu'une fois par process.
- [x] `onError` → `captureWithFeature(error, 'og-image')`, nouvelle valeur `'og-image'` dans `SentryFeature`. Vérifié en provoquant un asset injoignable : `onError` reçoit bien l'erreur.
- [ ] ~~`signal: request.signal`~~ — **écarté**. `ImageResponse` renvoie un flux consommé *après* le retour du handler. Selon le moment où srvx/Nitro abandonne le signal d'une requête GET sans corps, on risquerait d'annuler chaque rendu. Impossible à vérifier sans lancer le serveur ; le gain (couper le CPU quand un scraper abandonne un rendu de ~100 ms) ne justifie pas le risque de casser toutes les images OG.

P1 :

- [x] Schéma Zod en union discriminée à trois branches : `home` (aucun titre), types à défaut localisé (`ai-search`, `pricing`, `reels`, `submit`), types à titre obligatoire (`category`, `legal`). `OG_DEFAULT_TITLES` n'a plus d'entrée `undefined` et le fallback `?? type` a disparu. `BuildOgImageUrlParams` suit la même union : un `category` sans titre ne compile plus.
- [x] `lineClamp: 2` + `textOverflow: 'ellipsis'` sur le titre. Vérifié visuellement : titre de 78 caractères tronqué avec ellipse, sous-titre entièrement visible ; le cas court rend exactement les mêmes octets qu'avant (78 671 B).
- [x] `src/constants/http.ts` : `IMMUTABLE_CACHE_CONTROL`, `WEEKLY_CACHE_CONTROL`, `NO_CACHE_CONTROL`, `SECURITY_HEADERS`, importés par `vite.config.ts` et `og.ts`. Les deux points d'émission restent, avec un commentaire expliquant pourquoi.
- [x] `src/constants/og.ts` : `OG_IMAGE_WIDTH` / `OG_IMAGE_HEIGHT`, qui étaient écrits en dur trois fois (`og.ts`, `seo.ts` pour `og:image:width/height`, `og-stars.ts`).
- [x] `overrides` sur `src/components/og/**` dans `oxlint.config.ts`, les deux `/* oxlint-disable */` en tête de fichier sont supprimés. La règle n'est pas coupée : `['error', { ignore: ['tw'] }]`. Vérifié en injectant un `classname="oops"` → toujours signalé.
- [x] `og-stars.ts` : `Array.from({ length })` au lieu de `push`.
- [x] `OG_VERSION` passé à `2` avec le commentaire expliquant qu'il faut le bump à chaque refonte de template. Les URLs `v=1` déjà scrapées restent valides (`v` n'est pas dans le schéma, les clés inconnues sont ignorées).

### Vérifications

`pnpm run lint:fix` et `pnpm run build` passent. Le binding natif `@takumi-rs/core-darwin-arm64` est bien tracé dans `__server.func/node_modules`. Handler appelé directement depuis le bundle Vercel tracé :

| Cas | Statut | Content-Type | Cache-Control | Durée |
|---|---|---|---|---|
| `type=home&locale=fr` | 200 | image/png | `max-age=31536000, immutable` | 950 ms (froid) |
| `type=home&locale=en` | 200 | image/png | idem | 11 ms |
| `type=pricing` (titre par défaut) | 200 | image/png | idem | 46 ms |
| `type=category` + titre long | 200 | image/png | idem | 10 ms |
| `type=category` sans titre | 400 | text/plain | — | 1 ms |
| `type=legal` sans titre | 400 | text/plain | — | 0 ms |
| `type` inconnu | 400 | text/plain | — | 0 ms |

### Passe `/simplify` (4 agents : reuse, simplification, efficiency, altitude)

Appliqué :

- [x] `react/no-unknown-property` en `['error', { ignore: ['tw'] }]` au lieu de `'off'` — l'option existe bien dans le schéma oxlint. Un `classname` ou un `stlye` dans un template OG ne peut pas se repérer à l'œil, la règle doit rester vivante.
- [x] Code mort supprimé : `OG_TYPE_VALUES` et `OgImageType` n'avaient plus aucun consommateur après le passage à l'union discriminée. `OgTitledType` n'est plus exporté.
- [x] `src/components/og/og-backdrop.tsx` : le champ d'étoiles et la barre dégradée étaient dupliqués à l'identique dans les deux templates (16 lignes). Extraction vérifiée **au SHA-1** : `of-short.png` et `of-long.png` rendent des octets strictement identiques avant et après.
- [x] `NO_CACHE_CONTROL` supprimé — alias d'une chaîne nue utilisé une seule fois, qui prétendait être une source unique alors que `src/server/meme.ts:797` et `src/lib/sitemap.ts:197` gardaient leurs littéraux.
- [x] `SECURITY_HEADERS` remis dans `vite.config.ts` : c'est du build-only, sans dérivation. `src/constants/http.ts` ne garde que les deux valeurs dérivées de `constants/time.ts`, ce qui réduit la surface de l'import relatif depuis la config Vite.
- [x] Schéma Zod : `OG_SHARED_SHAPE` étalé dans les trois branches à la place des trois alias `*_FIELD`, ce qui laisse `title` seul visible comme la raison d'être de l'union.
- [x] `og-stars.ts` : `spread` sorti de la boucle (invariant), signature passée en paramètres objet (la règle projet plafonne à 2 positionnels, `generateStarShadows(80, 1, 42)` était illisible).
- [x] `og.ts` : `const query = parsed.data` au lieu d'une demi-déstructuration, docstring périmée qui parlait d'un `switch` inexistant supprimée, commentaire sur `fonts` raccourci.
- [x] Rappel de bump d'`OG_VERSION` déplacé dans `og-backdrop.tsx`, là où on édite les templates, plutôt que dans `seo.ts`.

Écarté, avec la raison :

- **Retirer `title` optionnel des quatre types à défaut.** Rendrait `?type=pricing&title=Foo` silencieusement différent (« Tarifs » au lieu de « Foo »). Aucune URL générée par l'app n'est concernée, mais c'est un changement de contrat sur un endpoint public qui n'a pas été demandé.
- **`OG_DEFAULT_TITLES` doublonne Paraglide** (`submit_heading` vaut déjà « Soumettre un mème »). Constat juste et c'est le point le plus profond de la zone, mais basculer sur `m.x({}, { locale })` change la source des libellés et donc potentiellement le rendu. À traiter séparément.
- **Déplacer `OG_DEFAULTED_TYPE_VALUES` / `OG_TITLED_TYPE_VALUES` dans `src/constants/og.ts`** pour réunir le domaine OG. Churn réel pour un gain de rangement ; `buildOgImageUrl` doit rester dans `seo.ts` de toute façon.
- **Propager un constant de cache dans `src/server/meme.ts` et `src/lib/sitemap.ts`.** Hors périmètre, et résolu autrement en supprimant `NO_CACHE_CONTROL`.
- **Dériver `'category' | 'legal'` de `OG_TITLED_TYPE_VALUES` dans `resolvePageTitle`.** `.includes()` ne narrowe pas : la version « profonde » serait strictement pire. Les deux modes de dérive sont déjà des erreurs de compilation.

Efficiency n'a rien trouvé à corriger : le keyspace du `fetchCache` est fermé à 8 clés (aucune entrée pilotée par la requête n'atteint une URL d'image), plafond ~460 Kio par instance.

### Risque résiduel assumé

`ImageResponse` répond **200 avec le `Cache-Control` immutable avant que le rendu ait commencé** : en cas d'échec, le flux est avorté après l'envoi des en-têtes. Vérifié. Le CDN ne devrait pas mettre en cache un corps tronqué, mais c'est une propriété du design streaming de takumi, pas un choix de ce projet, et c'était déjà le cas en v1. `onError` remonte désormais l'incident dans Sentry, ce qui est le vrai correctif accessible ici.

### Écarté après re-challenge

- **`cacheMaxBytes`** : sans objet. Le `ResourceCache` par défaut fait 16 Mio pour 8 assets (460 Kio encodés, décodés à la taille de dessin). Le régler ne peut que nuire.
- **Signature HMAC des paramètres** : l'Attack Challenge Mode couvre déjà le vecteur, les pages adossées à la DB sont plus chères à attaquer que `/api/og`, et signer impose un secret côté serveur alors que `buildOgImageUrl` tourne aussi au client dans `head()`. Coût réel, bénéfice marginal.
- **`measure()` pour ajuster la taille du titre** : une passe de layout supplémentaire par render pour un cas que `lineClamp` règle. Reproduit seulement à 78 caractères ; les vrais `category.title` sont courts.
- **`fonts: [fontUrl]`** : marche (`fontFromUrl`), mais le nom de famille viendrait du fichier au lieu du `Bricolage Grotesque` référencé par les templates. Couplage en plus, pas une ligne en moins.
- **`emoji: 'from-font'`** : la police de dernier recours est latine sans emoji, donc tofu. On garde `twemoji` en assumant la dépendance jsdelivr, désormais documentée. Aucun message SEO ne contient d'emoji aujourd'hui (`checkout_success_description` est le seul, hors OG).
- Confirmé écarté depuis la phase 1 : `renderSvg()`, `renderAnimation`, `setGlyphCacheMaxBytes`, `allowUrl`, `googleFonts()` / `baseUrl`, `:lang()`, layout grid, descripteurs `generic`.

### Outillage

- [x] Harnais de mesure sorti du repo, dans `/tmp/og-probe/` (éphémère). Contient : serveur statique local avec latence injectable, benchmark des deux templates, sondes de résolution de police, reproduction du débordement de titre, test de `text-fit`, appel direct du handler depuis le bundle Vercel tracé, vérification de `onError`. À promouvoir dans `scripts/` si on retouche encore les templates — non fait ici pour ne pas ajouter du code à maintenir sans demande.

### Amont

- [ ] Ouvrir une issue chez `kane50613/takumi` : la page d'intégration Nitro affirme que le binaire WASM est embarqué dans le bundle serveur, ce qui ne se vérifie pas (échec `WebAssembly.Module(): expected magic word`), et le guide de migration v1→v2 ne mentionne nulle part le changement de résolution du backend. Note : la 2.0.3 documente bien `exportConditions: ["!unwasm"]` dans ses notes de version, mais ce n'est repris nulle part dans la doc.
- [ ] Signaler que `fonts` a disparu des types publics de `takumi-js` alors que le runtime le supporte toujours.
- [ ] Signaler que `text-fit` est exposé dans `NodeAttributes` / `CSSProperties` sans être implémenté par le moteur de rendu.

# Plan — i18n contenu DB (Phase 2)

**Contexte :** L'interface est bilingue FR/EN (Paraglide). Cette phase internationalise les *données* (mèmes, catégories) stockées en base.

**Règle de sécurité :** Toute migration Prisma est additive. Backup pg_dump AVANT chaque migration.

**⚠️ Migrations prod :** Toutes les migrations seront appliquées en prod **une seule fois à la toute fin** (après toutes les phases terminées et testées localement). Ne pas faire de `prisma migrate deploy` en prod entre les phases.

**⚠️ Avant release prod :** `pg_dump` backup de la DB prod AVANT d'appliquer les migrations.

**Branche :** `feat/i18n-content` tirée depuis `feat/migrate-to-vercel` (branche de prod stable). Merge retour dans `feat/migrate-to-vercel` quand tout est terminé et testé.

### Stratégie de release (2 deploys)

**Deploy 1 — DB + Admin + Serveur + Frontend (Phases 2.0 + 2.1 + 2.2 + 2.4)**

Algolia reste sur l'ancien index unique. Le code serveur a un fallback `Meme.title` pour la fenêtre de transition.

1. `pg_dump` backup de la DB locale
2. Créer la migration Prisma localement (`prisma migrate dev`)
3. Tester localement
4. Push le code → Vercel deploy automatique
5. `vercel env pull .env.production` → `prisma migrate deploy` sur prod Neon
6. Le fallback `Meme.title` couvre la fenêtre entre deploy et migration
7. Tagger les mèmes et traduire via admin

**Deploy 2 — Algolia (Phase 2.3)**

Quand les mèmes sont taggés et les traductions prêtes.

1. `vercel env pull .env.production`
2. Créer les index prod + replicas + settings :
   ```bash
   npx vite-node --dotenv .env.production scripts/setup-algolia-indices.ts
   ```
3. Peupler les nouveaux index :
   ```bash
   npx vite-node --dotenv .env.production scripts/reindex-memes.ts
   ```
4. Vérifier dans le dashboard Algolia que les index prod `${prefix}_fr` et `${prefix}_en` contiennent les bons records
5. Push le code → Vercel deploy automatique
6. Vérifier que la recherche fonctionne dans les deux locales (FR + EN)
7. Supprimer l'ancien index prod et ses 3 replicas via le dashboard Algolia

---

## Décisions architecturales

### Visibilité par locale

Le champ `contentLocale` sur `Meme` détermine la **langue du contenu** (audio/texte dans la vidéo) et contrôle la visibilité dans les listes par locale.

| contentLocale | Signification | Visible en FR | Visible en EN |
|---|---|---|---|
| FR | Voix/texte FR dans la vidéo | Oui | Non (listes). Oui (URL directe) |
| EN | Voix/texte EN dans la vidéo | Oui (titre EN, les FR comprennent) | Oui |
| UNIVERSAL | Pas de langue nécessaire (humour visuel) | Oui (titre FR) | Oui (titre EN) |

- FR voit : FR + EN + UNIVERSAL
- EN voit : EN + UNIVERSAL
- URL directe : toujours accessible (pas de 404), fallback vers la langue source
- **Scalabilité N langues :** la visibilité est un mapping configurable `locale → contentLocales[]` dans le code. Ajouter une langue = ajouter une entrée au mapping.

### Traductions — pattern "tout dans la table de traductions"

**`Meme.title/description/keywords` et `Category.title/keywords` ne sont plus lus.** On ne peut pas les supprimer (migration additive), mais toutes les lectures passent par `MemeTranslation` et `CategoryTranslation`.

**Mèmes :**

| contentLocale | `MemeTranslation` rows | Contenu |
|---|---|---|
| FR | 1 row : `locale="fr"` | Titre/desc/keywords en FR |
| EN | 1 row : `locale="en"` | Titre/desc/keywords en EN |
| UNIVERSAL | 2 rows : `locale="fr"` + `locale="en"` | FR + EN obligatoires |

**Catégories :** toujours 2 rows (`locale="fr"` + `locale="en"`), les deux obligatoires.

**Résolution serveur (uniforme pour tous les cas) :**
1. Chercher `translation(locale = locale demandée)`
2. Si pas trouvé → fallback `translation(locale = contentLocale du mème)`

```
FR mème + user FR  → translation(fr) ✓
FR mème + user EN  → translation(en) ❌ → fallback translation(fr) ✓  (cas rare, URL directe)
EN mème + user FR  → translation(fr) ❌ → fallback translation(en) ✓  (titre EN, les FR comprennent)
EN mème + user EN  → translation(en) ✓
UNIVERSAL + user FR → translation(fr) ✓
UNIVERSAL + user EN → translation(en) ✓
```

### Algolia

- Un index par locale : `${prefix}_fr`, `${prefix}_en` (+ replicas standard chacun : _popular, _recent, _created)
- `memes_fr` contient FR + EN + UNIVERSAL :
  - FR → `MemeTranslation(locale="fr").title`
  - EN → `MemeTranslation(locale="en").title` (titre EN, tel quel pour les FR)
  - UNIVERSAL → `MemeTranslation(locale="fr").title`
- `memes_en` contient EN + UNIVERSAL :
  - EN → `MemeTranslation(locale="en").title`
  - UNIVERSAL → `MemeTranslation(locale="en").title`
- `queryLanguages` : `["fr", "en"]` pour `_fr` (contient des titres EN), `["en"]` pour `_en`
- **Coût free tier :** Replicas standard → chaque record est dupliqué dans les replicas. ~N × 4 + K × 4 records (N mèmes FR × 4 index _fr, K mèmes EN+UNIVERSAL × 4 index _en). Avec ~519 mèmes (100% FR) : 519 × 4 = ~2 076 records. Free tier = 10k records, ~10 index max → largement dans les limites.
- **Migration index existant :** l'ancien index (`VITE_ALGOLIA_INDEX`) est remplacé par `_fr` et `_en`. Stratégie zero-downtime dans la phase 2.3.

### SEO

- hreflang dans le sitemap pour mèmes multi-locale (EN + UNIVERSAL)
- Mèmes FR-only : pas d'entrée EN dans le sitemap (filtrer les FR-only de la boucle EN)
- JSON-LD, OG tags : titres résolus selon la locale via `MemeTranslation`

### Admin

- Page complète pour l'édition de mèmes (plus de dialog)
- Select `contentLocale` (FR/EN/UNIVERSAL) en haut
- Sections par langue avec flags — visibilité selon `contentLocale` :
  - FR → section 🇫🇷 uniquement
  - EN → section 🇬🇧 uniquement
  - UNIVERSAL → sections 🇫🇷 + 🇬🇧
- L'admin écrit dans `MemeTranslation`, plus dans `Meme.title`
- Catégories : sections 🇫🇷 + 🇬🇧 toujours (les deux obligatoires)

### Frontend

- Badge langue vidéo sur la page détail mème (et optionnellement dans les listes)
- Catégories virtuelles (News, Popular) traduites via Paraglide messages

---

## Phase 2.0 — Schema DB & Migration

### Prérequis

- [x] Backup DB locale : `pg_dump $DATABASE_URL > backup_pre_i18n.sql`

### Schema Prisma

- [x] Créer enum `MemeContentLocale` (FR, EN, UNIVERSAL)
- [x] Ajouter champ `contentLocale MemeContentLocale @default(FR)` sur `Meme`
- [x] Ajouter index `@@index([status, contentLocale])` sur `Meme` (pour `getRandomMeme`, `getBestMemesInternal`)
- [x] Créer table `MemeTranslation`
- [x] Créer table `CategoryTranslation`
- [x] Ajouter les relations `translations MemeTranslation[]` sur `Meme` et `translations CategoryTranslation[]` sur `Category`

### Migration des données

- [x] SET `contentLocale = 'FR'` sur tous les mèmes existants (via @default, automatique)
- [x] INSERT `MemeTranslation(locale="fr")` pour chaque mème existant (copie `title`, `description`, `keywords` depuis `Meme`)
- [x] INSERT `CategoryTranslation(locale="fr")` pour chaque catégorie existante (copie `title`, `keywords` depuis `Category`)
- [x] INSERT `CategoryTranslation(locale="en")` pour chaque catégorie existante (traductions EN par slug, fallback titre FR pour les slugs inconnus)

### Validation

- [x] Vérifier le SQL généré (pas de DROP, pas d'ALTER destructif)
- [x] `prisma generate` régénère le client (fait par `migrate dev`)
- [x] L'app compile sans erreur

**COMMIT : `feat(i18n): add MemeTranslation/CategoryTranslation schema and data migration`**

---

## Phase 2.1 — Admin (avant le serveur, pour pouvoir tagger et traduire les mèmes)

### Page mème (refonte)

- [x] Convertir le formulaire mème de dialog en page complète (formulaire inline dans `/admin/library/$memeId`)
- [x] Select `contentLocale` (FR / EN / UNIVERSAL) en haut du formulaire
- [x] Sections par langue, visibilité dynamique selon `contentLocale` :
  - FR → 🇫🇷 section uniquement (titre, description, keywords)
  - EN → 🇬🇧 section uniquement
  - UNIVERSAL → 🇫🇷 + 🇬🇧 sections
- [x] L'admin écrit dans `MemeTranslation` (plus dans `Meme.title`)
- [x] Validation Zod adaptée selon `contentLocale` (superRefine dynamique)

### Server functions admin

- [x] `MEME_FORM_SCHEMA` (`src/routes/admin/-server/memes.ts`) : `contentLocale` + `translations` par locale, validation dynamique via superRefine
- [x] `editMeme` : accepte `contentLocale` + `translations`, upsert `MemeTranslation` par locale, supprime les rows obsolètes si `contentLocale` change, sync `Meme.title`/`description`/`keywords` avec la locale source
- [x] `createMemeWithVideo` : crée une `MemeTranslation(locale='fr')` par défaut à la création. `Meme.title` garde le titre source comme copie dénormalisée

### Catégories

- [x] Formulaire catégorie : sections 🇫🇷 + 🇬🇧 (titre, keywords), les deux obligatoires
- [x] L'admin écrit dans `CategoryTranslation` (plus dans `Category.title`)
- [x] Server functions `addCategory` + `editCategory` : upsert `CategoryTranslation` pour les deux locales, sync `Category.title`/`keywords` avec FR

### Création de mème

- [x] Flow de création adapté : `createMemeWithVideo` crée une traduction FR par défaut

**COMMIT : `feat(i18n): admin UI for contentLocale and translations (memes + categories)`**

---

## Phase 2.2 — Couche serveur

### Helper de résolution locale

- [x] Créer `resolveMemeTranslation()` et `resolveCategoryTranslation()` dans `src/helpers/i18n-content.ts`
- [x] Créer `VISIBLE_CONTENT_LOCALES` mapping locale → contentLocales[] visibles

### Queries mèmes

- [x] `getMemeById()` : inclure `translations`, résoudre via `resolveMemeTranslation()`, résoudre aussi les catégories embarquées
- [x] `getRandomMeme()` : filtrer par `contentLocale` selon `VISIBLE_CONTENT_LOCALES[locale]`
- [x] `getBestMemesInternal()` : filtrer par `contentLocale` via `VISIBLE_CONTENT_LOCALES[locale]`
- [x] `contentLocale` dans les types de retour (via Prisma model + Algolia record)

### Queries catégories

- [x] `fetchCategories()` : inclure `translations` dans `CATEGORIES_INCLUDE`
- [x] `getCategories()` : cache stocke les données brutes, résolution par locale au read via `resolveCategories()`

### SEO

- [x] `buildMemeSeo()` : reçoit un mème avec title/description/keywords déjà résolus — aucun changement nécessaire
- [x] `buildMemeJsonLd()` : idem, données résolues en amont
- [x] `buildCategoryJsonLd()` : idem, title résolu via `getCategories()`

### Algolia (préparation Phase 2.3)

- [x] `memeToAlgoliaRecord()` : ajout `contentLocale` dans le record
- [x] `normalizeAlgoliaHit()` : fallback `contentLocale: 'FR'` pour records existants sans le champ

**COMMIT : `feat(i18n): locale-aware server queries, resolution helper, and SEO`**

---

## Phase 2.3 — Algolia

### Migration index existant (zero-downtime)

- [x] Étape 1 : créer les nouveaux index `${prefix}_fr` et `${prefix}_en` et leurs replicas via script `scripts/setup-algolia-indices.ts`
- [x] Étape 2 : code qui lit/écrit les nouveaux index (le code tombe en fallback si l'index est vide)
- [x] Étape 3 : peupler les nouveaux index via `scripts/reindex-memes.ts`
- [x] Étape 4 (dev) : supprimer l'ancien index `development` et ses replicas via dashboard
- [ ] Étape 4 (prod) : supprimer l'ancien index prod et ses replicas via dashboard (après deploy + validation)
- [x] Garder `VITE_ALGOLIA_INDEX` comme préfixe (le code ajoute `_fr`/`_en` selon la locale — pas de changement d'env var nécessaire)

**Note :** Les replicas sont **standard** (pas virtual) car le free tier Algolia bloque la création de virtual replicas via l'API. Fonctionnellement identique, un peu plus de records comptés mais on est loin des 10k du free tier.

### Configuration par index

- [x] `queryLanguages` : `["fr", "en"]` pour `_fr` (contient des titres EN pour les mèmes EN), `["en"]` pour `_en`
- [x] `ignorePlurals`, `removeStopWords` adaptés par langue
- [x] `searchableAttributes`, `attributesForFaceting`, `customRanking` configurés via script

### Sync cron (`src/routes/api/cron/sync-algolia.ts`)

- [x] Le cron génère deux sets de records, titres résolus depuis `MemeTranslation` :
  - `memes_fr` : tous les mèmes (FR+EN+UNIVERSAL), titres résolus pour locale "fr" (FR→translation(fr), EN→translation(en) fallback, UNIVERSAL→translation(fr))
  - `memes_en` : mèmes EN+UNIVERSAL, titres résolus pour locale "en"
- [x] `memeToAlgoliaRecord()` (`src/lib/algolia.ts`) : accepte un paramètre `locale` pour résoudre le bon titre depuis `translations`
- [x] `categoryTitles[]` dans les records : localisés depuis `CategoryTranslation`
- [x] Inclure `translations` dans la query du cron (un seul fetch avec `include: { translations: true }`)

### Admin Algolia writes

- [x] `editMeme` (`src/routes/admin/-server/memes.ts`) : `syncMemeToAllIndices()` — save aux index cibles, delete des non-cibles
- [x] `createMemeWithVideo` : `syncMemeToAllIndices()` sur les index cibles
- [x] `deleteMemeById` : `deleteMemeFromAllIndices()` sur tous les index
- [x] Script `scripts/reindex-memes.ts` : mis à jour pour les deux index
- [x] Script `scripts/setup-algolia-indices.ts` : crée et configure les index primaires + replicas standard avec settings (searchableAttributes, attributesForFaceting, customRanking, queryLanguages, ignorePlurals, removeStopWords)
- [x] Bunny webhook (`src/routes/api/bunny.ts`) : `syncMemeToAllIndices()` au lieu de `partialUpdateObject`

### Search

- [x] `getMemes()` (`src/server/meme.ts`) : `resolveSearchIndex(category, hasQuery, locale)` — index de la locale courante
- [x] `getRelatedMemes()` : index Algolia de la locale courante
- [x] `getTrendingMemes()` : index Algolia de la locale courante
- [x] `getRecentCountMemes()` : index Algolia de la locale courante
- [x] Cache keys locale-aware (ajout du locale dans les clés de cache)

### Insights

- [x] `src/lib/algolia-insights.ts` : `getInsightsIndex()` utilise `getLocale()` pour cibler l'index de la locale courante
- [x] `registerMemeView` (`src/server/meme.ts`) : event view envoyé à l'index de la locale courante
- [x] Les objectIDs restent identiques entre index (= `memeId`)

### Synonymes EN

- [ ] Reporté : ajouter via le dashboard Algolia quand le contenu EN atteint une masse critique

**COMMIT : `feat(i18n): Algolia multi-index per locale with sync, search, and insights`**

---

## Phase 2.4 — Frontend & SEO

### Sitemap (`src/routes/sitemap[.]xml.ts`)

- [x] Filtrer les mèmes FR-only de la boucle EN (le sitemap actuel génère des URLs pour toutes les locales via `locales.map()` — ajouter un filtre `contentLocale`)
- [x] Pour les mèmes EN + UNIVERSAL : hreflang FR + EN (le mécanisme `buildHreflangLinks` existe déjà, s'assurer qu'il est conditionnel)
- [x] Titres/descriptions localisés dans `<image:title>` et `<video:title>` (résoudre depuis `MemeTranslation` par locale)
- [x] Catégories : hreflang FR + EN pour toutes

### Catégories virtuelles

- [x] Ajouter messages Paraglide : `meme_category_news`, `meme_category_popular` (FR + EN)
- [x] `VIRTUAL_CATEGORIES` → `getVirtualCategories()` : title devient un appel `m.meme_category_news()` / `m.meme_category_popular()`

### Badge langue vidéo

- [x] Badge affichant le drapeau + label localisé de la langue du contenu (via `CONTENT_LOCALE_META` + messages Paraglide `meme_content_locale_*`)
- [x] Affiché sur la page détail mème (à côté du titre)
- [ ] Optionnel : afficher dans les listes aussi

**COMMIT : `feat(i18n): frontend locale filtering, sitemap hreflang, and content badges`**

---

## Hors scope (reporté)

- Traduction automatique via IA (Claude API)
- Interface de traduction batch
- 3e langue (le schema est prêt, pas d'implémentation)
- Algolia : activer les modèles Recommend (pas assez d'events)
- Synonymes EN Algolia (ajouter via dashboard quand contenu EN suffisant)
- Sync incrémentale Algolia (optimisation future : tracker `updatedAt` au lieu de `replaceAllObjects`)

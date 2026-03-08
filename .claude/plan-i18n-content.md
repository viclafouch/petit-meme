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

1. Créer les index `${prefix}_fr` et `${prefix}_en` (vides) + replicas via Algolia dashboard. Configurer sur chaque index : `searchableAttributes`, `attributesForFaceting`, `queryLanguages`, `ignorePlurals`, `removeStopWords` (copier la config de l'ancien index puis adapter par langue)
2. Push le code Phase 2.3 → Vercel deploy
3. Lancer le cron sync (peuple les nouveaux index)
4. Vérifier que la recherche fonctionne dans les deux locales
5. Supprimer l'ancien index et ses replicas via Algolia dashboard

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

- Un index par locale : `${prefix}_fr`, `${prefix}_en` (+ replicas virtuelles chacun : _popular, _recent, _created)
- `memes_fr` contient FR + EN + UNIVERSAL :
  - FR → `MemeTranslation(locale="fr").title`
  - EN → `MemeTranslation(locale="en").title` (titre EN, tel quel pour les FR)
  - UNIVERSAL → `MemeTranslation(locale="fr").title`
- `memes_en` contient EN + UNIVERSAL :
  - EN → `MemeTranslation(locale="en").title`
  - UNIVERSAL → `MemeTranslation(locale="en").title`
- `queryLanguages` : `["fr", "en"]` pour `_fr` (contient des titres EN), `["en"]` pour `_en`
- **Coût free tier :** ~N + K records (N mèmes total, K = EN+UNIVERSAL). 8 index (2 primaires + 6 replicas virtuelles). Free tier = 10k records, ~10 index max. Surveiller.
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

- [ ] Convertir le formulaire mème de dialog en page complète (`/admin/library/:id/edit` ou similaire)
- [ ] Select `contentLocale` (FR / EN / UNIVERSAL) en haut du formulaire
- [ ] Sections par langue, visibilité dynamique selon `contentLocale` :
  - FR → 🇫🇷 section uniquement (titre, description, keywords)
  - EN → 🇬🇧 section uniquement
  - UNIVERSAL → 🇫🇷 + 🇬🇧 sections
- [ ] L'admin écrit dans `MemeTranslation` (plus dans `Meme.title`)
- [ ] Validation Zod adaptée selon `contentLocale`

### Server functions admin

- [ ] `MEME_FORM_SCHEMA` (`src/routes/admin/-server/memes.ts`) : ajouter `contentLocale` et champs traduction par locale
- [ ] `editMeme` : accepter `contentLocale` + `translations`, sauvegarder dans `MemeTranslation` (upsert par locale), supprimer les rows obsolètes si `contentLocale` change
- [ ] `createMemeWithVideo` / `createMemeFromTwitterUrl` : accepter `contentLocale` + `translations`, créer les `MemeTranslation` rows. **Note :** `Meme.title` est NOT NULL sans default — écrire le titre source comme copie dénormalisée (jamais lu, juste pour satisfaire la contrainte DB)

### Catégories

- [ ] Formulaire catégorie : sections 🇫🇷 + 🇬🇧 (titre, keywords), les deux obligatoires
- [ ] L'admin écrit dans `CategoryTranslation` (plus dans `Category.title`)
- [ ] Server function `editCategory` : sauvegarder dans `CategoryTranslation`

### Création de mème

- [ ] Flow de création adapté avec `contentLocale` + traductions

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

- [ ] Étape 1 : créer les nouveaux index `${prefix}_fr` et `${prefix}_en` et leurs replicas virtuelles
- [ ] Étape 2 : déployer le code qui lit/écrit les nouveaux index (le code tombe en fallback si l'index est vide)
- [ ] Étape 3 : lancer le cron sync pour peupler les nouveaux index
- [ ] Étape 4 : supprimer l'ancien index et ses replicas (libère le quota)
- [ ] Garder `VITE_ALGOLIA_INDEX` comme préfixe (le code ajoute `_fr`/`_en` selon la locale — pas de changement d'env var nécessaire)

### Configuration par index

- [ ] `queryLanguages` : `["fr", "en"]` pour `_fr` (contient des titres EN pour les mèmes EN), `["en"]` pour `_en`
- [ ] `ignorePlurals`, `removeStopWords` adaptés par langue

### Sync cron (`src/routes/api/cron/sync-algolia.ts`)

- [ ] Le cron génère deux sets de records, titres résolus depuis `MemeTranslation` :
  - `memes_fr` : tous les mèmes (FR+EN+UNIVERSAL), titres résolus pour locale "fr" (FR→translation(fr), EN→translation(en) fallback, UNIVERSAL→translation(fr))
  - `memes_en` : mèmes EN+UNIVERSAL, titres résolus pour locale "en"
- [ ] `memeToAlgoliaRecord()` (`src/lib/algolia.ts`) : accepte un paramètre `locale` pour résoudre le bon titre depuis `translations`
- [ ] `categoryTitles[]` dans les records : localisés depuis `CategoryTranslation`
- [ ] Inclure `translations` dans la query du cron (un seul fetch avec `include: { translations: true }`)

### Admin Algolia writes

- [ ] `editMeme` (`src/routes/admin/-server/memes.ts`) : `partialUpdateObject`/`saveObject` sur **les deux** index (ou uniquement les pertinents selon `contentLocale`)
- [ ] `createMemeWithVideo` : `saveObject` sur les deux index
- [ ] `deleteMemeById` : `deleteObject` sur les deux index
- [ ] Script `scripts/reindex-memes.ts` : mettre à jour pour les deux index

### Search

- [ ] `getMemes()` (`src/server/meme.ts`) : utiliser l'index de la locale courante. Mettre à jour `resolveIndexName()` pour dériver le nom d'index depuis la locale.
- [ ] `getRelatedMemes()` : utiliser l'index Algolia de la locale courante (requiert les nouveaux index)

### Insights

- [ ] `src/lib/algolia-insights.ts` : `sendClickEvent`, `sendConversionEvent`, `sendViewEvent` doivent cibler l'index de la locale courante (passer le nom d'index depuis les résultats de recherche au lieu du hardcodé `VITE_ALGOLIA_INDEX`)
- [ ] `registerMemeView` (`src/server/meme.ts`) : envoyer l'event view à l'index de la locale courante
- [ ] Les objectIDs restent identiques entre index (= `memeId`)

### Synonymes EN

- [ ] Reporté : ajouter via le dashboard Algolia quand le contenu EN atteint une masse critique

**COMMIT : `feat(i18n): Algolia multi-index per locale with sync, search, and insights`**

---

## Phase 2.4 — Frontend & SEO

### Sitemap (`src/routes/sitemap[.]xml.ts`)

- [ ] Filtrer les mèmes FR-only de la boucle EN (le sitemap actuel génère des URLs pour toutes les locales via `locales.map()` — ajouter un filtre `contentLocale`)
- [ ] Pour les mèmes EN + UNIVERSAL : hreflang FR + EN (le mécanisme `buildHreflangLinks` existe déjà, s'assurer qu'il est conditionnel)
- [ ] Titres/descriptions localisés dans `<image:title>` et `<video:title>` (résoudre depuis `MemeTranslation` par locale)
- [ ] Catégories : hreflang FR + EN pour toutes

### Catégories virtuelles

- [ ] Ajouter messages Paraglide : `category_news`, `category_popular` (FR + EN)
- [ ] `VIRTUAL_CATEGORIES` (`src/constants/meme.ts`) : `title` devient un appel `m.category_news()` (le type change de `string` statique à `string` dynamique)

### Badge langue vidéo

- [ ] Composant badge affichant l'icône de la langue du contenu (drapeau ou label)
- [ ] Affiché sur la page détail mème
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

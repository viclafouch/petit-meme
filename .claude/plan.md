# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Catégorie "Tendances" — Page mèmes par défaut

Problème : la page `/memes/` affiche toujours les mêmes mèmes populaires all-time. Aucune impression de renouvellement pour l'utilisateur.

Solution : nouvelle catégorie virtuelle "Tendances" basée sur l'activité récente (scoring pondéré sur 7 jours), qui devient la catégorie par défaut.

### Scoring

Réutilise la logique du dashboard admin (`src/routes/admin/-server/dashboard.ts`) :
- Vues (x1), favoris (x2), téléchargements (x3), générations studio (x4), partages (x5)
- Fenêtre : 7 jours glissants
- Sources : `meme_view_daily`, `user_bookmark`, `meme_action_daily`, `studio_generation`

### Cache

- Cache DB via `recommend_cache` (table existante), TTL 12 heures. Stocke uniquement les IDs triés (pas les objets mèmes)
- Clé de cache : `trending-category:{contentLocales}`
- Chaque requête : 1 lecture cache + 1 fetch mèmes par IDs (léger). Le scoring SQL coûteux ne tourne qu'à l'expiration du cache
- Coût Algolia : zéro
- Index composites ajoutés : `MemeViewDaily(day, memeId)`, `UserBookmark(createdAt, memeId)` — migration additive requise

### Comportement

- `/memes/` redirige côté client vers `/memes/category/trending` (au lieu de `all`), pas de 301 pour préserver le SEO
- Désélection d'une catégorie → retour sur Tendances
- Grille sans pagination, top 30 max (si moins de 30 tendances, la page est simplement plus courte)
- Si recherche textuelle → bascule sur Algolia (comme les autres catégories)
- Filtre langue (contentLocales) appliqué au niveau du mème (JOIN sur `meme.content_locale`), pas sur les tables d'analytics
- Fallback uniquement si 0 résultats (sécurité) : populaire all-time

### Catégories virtuelles (ordre des pills)

Tendances → Nouveautés → Populaire → [catégories DB]

### Hors scope

- Pas de changement sur la home page ("Best Memes" Algolia Recommend)
- Pas de modification des replicas Algolia
- Pas de cron (recalcul à la demande, à l'expiration du cache)

### Tâches

- [x] Ajouter la catégorie virtuelle `trending` dans `src/constants/meme.ts` (slug, traductions FR/EN)
- [x] Créer la server function de calcul des tendances (scoring pondéré 7j, cache in-memory 12h via `withAlgoliaCache`)
- [x] Intégrer dans `getMemes` : quand category = `trending` et pas de query, utiliser le calcul DB au lieu d'Algolia
- [x] Modifier la redirection `/memes/` → `/memes/category/trending` (client-side, sans 301)
- [x] Désélection de catégorie → retour sur Tendances (automatique via redirect `/memes/`)
- [x] `getVirtualCategories()` : ordre Tendances → Nouveautés → Populaire → DB cats
- [x] Pas de pagination pour Tendances (`search-memes.tsx`)
- [x] Filtre contentLocales dans le calcul tendances (via `resolveVisibleContentLocales` + SQL `content_locale IN`)
- [x] Messages i18n FR ("Tendances") / EN ("Trending")
- [x] Sitemap : `/memes/category/trending` ajouté
- [x] SEO : géré automatiquement par le loader virtual category existant

---

## Better Auth

**Type `UserWithRole` vs `InferUser` :** Bug interne où `UserWithRole.role` est `string | undefined` mais le type inféré retourne `string | null | undefined`. Fix appliqué : type `SessionUser` custom dans `src/lib/role.ts`.

- [ ] Ouvrir une issue upstream sur Better Auth pour aligner `UserWithRole.role` avec le type inféré

**Issues à surveiller :** [#2596](https://github.com/better-auth/better-auth/issues/2596), [#3033](https://github.com/better-auth/better-auth/issues/3033), [#7452](https://github.com/better-auth/better-auth/issues/7452)

---

## Algolia — Activer les modèles Recommend

- [x] Activer "Related Items" dans le dashboard Algolia → Recommend — content-based filtering activé (2026-04-03) avec attributs `title`, `description`, `keywords`. Modèle en cours d'entraînement. Le code (`getRelatedMemes` + composant `RelatedMemes` sur page slug) est déjà en place avec fallback par titre.
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend — nécessite 10 000 events (604 actuellement). Accélérer via upload CSV d'events passés depuis `MemeViewDaily`.
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent
- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

## SEO — Items restants

- [ ] Surveiller le Video Indexing Report dans Search Console
- [ ] Stocker `width`/`height` dans le modèle `Video` (migration additive) — permet des `og:video:width/height` corrects par meme au lieu du 1280x720 hardcodé

## Admin — Items reportés

- [x] Fix "Dernière activité" affichant "Jamais" pour la majorité des users — ajout champ `lastActiveAt` sur User, mis à jour via `databaseHooks` session create/update (1 write/user/jour max). Admin lit directement `user.lastActiveAt`, plus de dépendance aux sessions. Migration additive requise (`last_active_at`). RGPD : privacy policies FR/EN mises à jour, export de données complété
- [ ] RGPD : clear `last_active_at` à l'anonymisation (cron cleanup) + migrer la requête d'éligibilité vers `lastActiveAt`
- [ ] Rate limiting sur les preview deployments Vercel (infra)
- [ ] Rate limiting dédié sur le tracking share/download (dédoublonnage par user/meme)
- `getListUsers` extraction bloquée : module-level functions using `prismaClient` break Vite client bundle (TanStack Start only strips `.handler()` body)
- Bans temporaires (`banExpires`) — non prioritaire
- Extraction sous-composants `categories/`, `library/`, `downloader.tsx`

## Bug — Sérialisation `customErrorAdapter`

- [ ] **Bug sérialisation** : `customErrorAdapter` dans `start.ts` sérialise côté serveur (tag `$TSR/t/custom-error`) mais le plugin n'est pas enregistré côté client → erreur seroval à la désérialisation. Affecte TOUS les `StudioError` throwés depuis des server functions (PREMIUM_REQUIRED, UNAUTHORIZED, etc.) — jamais testé jusqu'ici. À investiguer : restart dev server, vérifier si `createStart` enregistre les adapters côté client, ou changer d'approche.

## Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

---

## Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

---

## Internationalisation — Backlog

- [ ] Synonymes EN Algolia — ajouter via dashboard quand contenu EN atteint une masse critique
- [ ] Sync incrémentale Algolia — tracker `updatedAt` au lieu de `replaceAllObjects` dans le cron (optimisation future)
- [ ] 3e langue — le schema DB est prêt (mapping `locale → contentLocales[]`), pas d'implémentation prévue pour l'instant

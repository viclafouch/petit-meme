## Database & Prisma Migrations

### Principe

- **Dev** : `prisma migrate dev` crée les fichiers de migration ET les applique à la DB locale
- **Prod** : `prisma migrate deploy` applique les migrations pendantes (safe, idempotent, jamais de perte de données)
- **JAMAIS `prisma db push` en production** — aucun tracking, peut dropper des colonnes silencieusement

### Règles de sécurité (production)

L'app est en production avec des utilisateurs et des données réelles.

- **Migrations additives uniquement** : nouveaux champs optionnels (`?`), nouveaux index, nouvelles tables
- **JAMAIS** de suppression/renommage de colonnes, tables ou enums
- **JAMAIS** de `prisma migrate reset` en production
- **JAMAIS** de `prisma db push` en production
- Nouveaux champs obligatoires (`NOT NULL`) : toujours ajouter un `@default()` pour ne pas casser les lignes existantes

### Workflow — Modification du schema

#### 1. Modifier le schema localement

Éditer `prisma/schema.prisma`.

#### 2. Créer la migration

```bash
npx prisma migrate dev --name <nom_descriptif>
```

Cela :
- Crée le fichier SQL dans `prisma/migrations/<timestamp>_<nom>/migration.sql`
- Applique la migration à la DB locale
- Régénère le Prisma Client

Conventions de nommage : `add_rate_limit`, `add_user_avatar`, `add_index_meme_status` (snake_case, descriptif).

#### 3. Vérifier le SQL généré

Toujours relire le fichier `migration.sql` généré pour s'assurer qu'il ne contient aucune opération destructive (DROP, ALTER COLUMN type change, etc.).

#### 4. Commit & push

Le push déclenche le deploy Railway automatiquement.

#### 5. Appliquer en production

Après le deploy Railway, appliquer les migrations via Railway CLI :

```bash
railway run npx prisma migrate deploy
```

`migrate deploy` est safe : il n'applique que les migrations non encore appliquées et ne touche jamais au schema directement.

### Premier baselining (une seule fois)

Si la table `_prisma_migrations` n'existe pas en production (parce que `db push` était utilisé), il faut marquer les migrations existantes comme déjà appliquées :

```bash
railway run npx prisma migrate resolve --applied 20251218085720_meme_view_daily
railway run npx prisma migrate resolve --applied 20260219110916_sync_meme_columns_indexes
railway run npx prisma migrate resolve --applied 20260219110917_add_user_terms_privacy
```

Cela crée la table `_prisma_migrations` et enregistre ces migrations comme appliquées sans les ré-exécuter. Ensuite `migrate deploy` ne traitera que les nouvelles.

### Commandes de référence

| Commande | Environnement | Usage |
|----------|--------------|-------|
| `npx prisma migrate dev --name <nom>` | Local | Créer + appliquer une migration |
| `npx prisma generate` | Local | Régénérer le client (aussi dans `postinstall`) |
| `railway run npx prisma migrate deploy` | Production | Appliquer les migrations pendantes |
| `railway run npx prisma migrate status` | Production | Vérifier l'état des migrations |
| `railway run npx prisma migrate resolve --applied <nom>` | Production | Marquer une migration comme déjà appliquée (baselining) |

### Ce que Claude Code ne doit JAMAIS faire

- Exécuter `prisma migrate dev` (nécessite la DB locale, c'est l'utilisateur qui le fait)
- Exécuter `prisma db push`
- Créer des migrations destructives (DROP, renommage)
- Modifier manuellement les fichiers `migration.sql` générés

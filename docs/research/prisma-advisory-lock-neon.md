# P1002 : le verrou consultatif de Prisma Migrate reste pris sur Neon

Recherche menée le 2026-08-21, sur Prisma 7.9.0 et Neon Postgres 17.
Chaque affirmation porte sa source. Ce qui relève de la déduction est marqué **Déduction**.

Symptôme :

```
Error: P1002
The database server was reached but timed out.
Context: Timed out trying to acquire a postgres advisory lock (SELECT pg_advisory_lock(72707369)). Timeout: 10000ms.
```

## 1. Mécanisme

### Un verrou de session ne meurt qu'avec son backend

PostgreSQL est explicite : « Once acquired at session level, an advisory lock is held until explicitly released or the session ends. » ([PostgreSQL 17, Explicit Locking](https://www.postgresql.org/docs/17/explicit-locking.html)). Et la libération automatique est fiable : `pg_advisory_unlock_all` « is implicitly invoked at session end, even if the client disconnects ungracefully » ([PostgreSQL 17, System Administration Functions](https://www.postgresql.org/docs/17/functions-admin.html)).

Donc le verrou ne peut survivre que si le *backend* survit. Le processus `prisma migrate deploy` qui se termine n'est pas la fin de la session, dès lors que la session appartient à un pooler et non au client.

### Neon met PgBouncer sur le chemin, en mode transaction

Neon documente que le pooling passe par PgBouncer en `pool_mode=transaction`, et liste sans ambiguïté ce qui ne fonctionne pas dans ce mode, dont **les verrous consultatifs de session** ([Neon, Connection pooling](https://neon.com/docs/connect/connection-pooling)). La même page range les migrations de schéma du côté des connexions directes.

Le fichier de configuration réel est public dans le dépôt Neon ([`compute/etc/pgbouncer.ini`](https://github.com/neondatabase/neon/blob/main/compute/etc/pgbouncer.ini)) :

```ini
;; pgbouncer propagates application_name (if it's specified) to the server, but some
;; clients don't set it. We set default application_name=pgbouncer to make it
;; easier to identify pgbouncer connections in Postgres. If client sets
;; application_name, it will be used instead.
*=host=localhost port=5432 auth_user=cloud_admin application_name=pgbouncer
[pgbouncer]
listen_port=6432
pool_mode=transaction
max_client_conn=10000
default_pool_size=64
```

Trois choses en sortent. PgBouncer tourne **sur le nœud de calcul**, devant le Postgres local. Le mode est `transaction`. Et `application_name=pgbouncer` n'est pas un nom de client : c'est la valeur que PgBouncer pose sur **la connexion serveur** qu'il ouvre, quand le client n'en fournit pas. Le moteur de schéma de Prisma ne pose pas d'`application_name`, donc une session Prisma passée par le pooler s'affiche exactement comme ça.

### Pourquoi le verrou n'est jamais nettoyé

PgBouncer rend la connexion serveur au pool à la fin de chaque transaction, et sa documentation précise que la requête de remise à zéro n'est pas jouée dans ce mode : « When transaction pooling is used, the `server_reset_query` is not used. » Le défaut de `server_reset_query` est `DISCARD ALL`, et `server_reset_query_always` vaut `0` ([PgBouncer, config](https://www.pgbouncer.org/config.html)). Le `pgbouncer.ini` de Neon ne redéfinit ni l'un ni l'autre.

Or `DISCARD ALL` est précisément ce qui aurait libéré le verrou : la commande équivaut, entre autres, à `SELECT pg_advisory_unlock_all();` ([PostgreSQL 17, DISCARD](https://www.postgresql.org/docs/17/sql-discard.html)).

La chaîne complète :

1. `migrate deploy` se connecte par l'hôte `-pooler` et exécute `SELECT pg_advisory_lock(72707369)` sur un backend serveur du pool.
2. La transaction se termine. PgBouncer rend ce backend au pool. Le verrou, lui, est de niveau session : il reste.
3. Aucun `DISCARD ALL` n'est joué en mode transaction. Personne ne libère rien.
4. Le backend reste vivant et verrouillé, disponible pour n'importe quel autre client.

### Pourquoi il finit par disparaître

Deux minuteries suffisent à expliquer « au bout de quelques minutes ». Les défauts PgBouncer non redéfinis par Neon : `server_idle_timeout` à 600 s, `server_lifetime` à 3600 s ([PgBouncer, config](https://www.pgbouncer.org/config.html)). Et le calcul Neon se met en veille après cinq minutes d'inactivité ([Neon, Scale to zero](https://neon.com/docs/introduction/scale-to-zero)), ce qui coupe tout.

### Les deux observations restantes

**Le backend qui exécute ma propre requête ad hoc semble détenir le verrou.** **Déduction**, cohérente avec `pool_mode=transaction` : si la requête de diagnostic passe elle aussi par le pooler, PgBouncer peut lui attribuer exactement le backend qui détient le verrou. Confiance haute.

**L'hôte non poolé n'a rien changé.** **Déduction** : le verrou était déjà échoué sur un backend PgBouncer avant la bascule. Une nouvelle session directe ne peut pas libérer le verrou d'une autre session, elle ne peut que l'attendre dix secondes. Changer d'URL change l'avenir, pas le passé. Confiance haute.

**Ce que je n'ai pas pu établir depuis une source primaire :** si le point de terminaison sans `-pooler` atteint vraiment Postgres sans traverser le PgBouncer local. La documentation Neon le présente comme direct ([Neon, Connection pooling](https://neon.com/docs/connect/connection-pooling)), mais le seul code public que j'ai trouvé sur le routage se contente de retirer le suffixe pour identifier le point de terminaison ([`proxy/src/types.rs`](https://github.com/neondatabase/neon/blob/main/proxy/src/types.rs)) ; la décision de port vit dans le plan de contrôle, qui n'est pas public. Le fait que *toutes* les sessions affichent `application_name = pgbouncer` s'explique déjà par les backends que le pooler garde ouverts pour l'application, donc l'observation ne tranche pas la question.

## 2. Le correctif côté Prisma

### Ce que la documentation dit

Prisma pose un verrou consultatif sur `migrate deploy`, `migrate dev` et `migrate resolve`. « Advisory locking has a **10 second timeout** (not configurable) ». « Since `5.3.0`, the advisory locking can be disabled using the `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK` environment variable ». Et : « Prisma Migrate's implementation of advisory locking is purely to avoid catastrophic errors - if your command times out, you will need to run it again. » ([Prisma, Development and production — Advisory locking](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production#advisory-locking), cible de `https://pris.ly/d/migrate-advisory-locking`).

### Ce que le drapeau fait vraiment, vérifié dans le code

Source du moteur ([`schema-engine/connectors/sql-schema-connector/src/lib.rs`](https://github.com/prisma/prisma-engines/blob/main/schema-engine/connectors/sql-schema-connector/src/lib.rs)) :

```rust
fn acquire_lock(&mut self) -> BoxFuture<'_, ConnectorResult<()>> {
    // If the env is set and non empty or set to `0`, we disable the lock.
    // TODO: avoid using `std::env::var` in Wasm.
    let disable_lock: bool = std::env::var("PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK")
        .ok()
        .map(|value| !matches!(value.as_str(), "0" | ""))
        .unwrap_or(false);

    if disable_lock {
        tracing::info!("PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK environnement variable is set. Advisory lock is disabled.");
        return Box::pin(future::ready(Ok(())));
    }
    Box::pin(self.inner.acquire_lock())
}
```

Le drapeau ne raccourcit pas le délai et ne bascule pas vers un verrou de transaction : **aucun verrou n'est pris**. Toute valeur autre que vide ou `0` le déclenche, ce que confirme la description de la pull request d'origine ([prisma-engines#4171](https://github.com/prisma/prisma-engines/pull/4171), fusionnée le 2023-08-28), écrite à l'origine pour Percona XtraDB Cluster et MariaDB Galera.

Le verrou lui même est pris sur une connexion, sans indice de session, dans [`flavour/postgres.rs`](https://github.com/prisma/prisma-engines/blob/main/schema-engine/connectors/sql-schema-connector/src/flavour/postgres.rs) :

```rust
const ADVISORY_LOCK_TIMEOUT: time::Duration = time::Duration::from_secs(10);
// 72707369 is a unique number we chose to identify Migrate.
connection.raw_cmd("SELECT pg_advisory_lock(72707369)")
```

### Le drapeau existe bien dans la version installée ici

Vérifié dans le dépôt, pas dans un article de blog.

- `node_modules/.pnpm/prisma@7.9.0*/node_modules/prisma/build/cli.js` ne contient la chaîne qu'une seule fois, dans la liste des variables d'environnement affichée par `prisma debug`. Ce n'est pas la CLI qui lit le drapeau.
- Le binaire natif `node_modules/.pnpm/@prisma+engines@7.9.0/node_modules/@prisma/engines/schema-engine-darwin-arm64` contient la chaîne, avec la référence de fichier `schema-engine/connectors/sql-schema-connector/src/lib.rs:430` et le message de log. Le drapeau est donc actif dans ce chemin d'exécution.
- Aucun des `.wasm` livrés dans `prisma/build`, y compris `schema_engine_bg.wasm`, ne contient la chaîne.

**Déduction** sur ce dernier point : le `TODO: avoid using std::env::var in Wasm` du code source va dans le même sens, `std::env::var` ne renvoyant rien sur `wasm32-unknown-unknown`, ce qui permet au compilateur de supprimer le littéral devenu inutile. Conséquence probable : **le drapeau n'a aucun effet quand le moteur de schéma wasm est utilisé**, c'est à dire par le chemin des adaptateurs de pilote. Confiance moyenne, je n'ai pas trouvé de source Prisma qui l'énonce. Ce qui la relèverait : un test réel, ou une confirmation dans le dépôt Prisma. Ce dépôt n'est pas concerné : `prisma.config.ts` déclare `datasource: { url: env('DATABASE_URL') }` sans adaptateur, donc la CLI passe par le binaire natif.

### Le risque à le désactiver

Le mainteneur Prisma qui a ajouté la variable la conditionne explicitement : « ⚠️ In this case here, only use this environment variable if you are sure that you won't start `migrate` concurrently on your database. You must ensure that only 1 instance of `migrate` can run at any time when using `migrate dev/deploy/resolve`. » ([prisma/prisma#12999](https://github.com/prisma/prisma/issues/12999)).

Le mode de défaillance associé est documenté : deux `migrate deploy` parallèles sur le même schéma avec le drapeau actif produisent des échecs aléatoires `migrate found failed migrations in the target database`, attribués à l'écriture concurrente dans `_prisma_migrations` ([prisma/prisma#25996](https://github.com/prisma/prisma/issues/25996), fermée).

### Ce que Prisma recommande officiellement pour Neon

La page Neon de Prisma dit de séparer les deux URL : la chaîne poolée pour le client, une variable dédiée pour la CLI, pointée depuis `prisma.config.ts` avec `url: env("DIRECT_URL")` ([Prisma, Neon](https://www.prisma.io/docs/orm/overview/databases/neon)).

Attention à la formulation historique : `datasource.directUrl` **n'existe plus en Prisma 7**, « removed in Prisma ORM v7 in favor of the `url` property » ([Prisma, prisma.config reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)). En Prisma 7, l'URL déclarée dans `prisma.config.ts` *est* l'URL de migration, et c'est le seul endroit à changer.

La page d'erreur officielle pour `P1002` ne dit rien de plus que « was reached but timed out. Please try again. » ([Prisma, Error reference](https://www.prisma.io/docs/orm/reference/error-reference)).

## 3. Le conseil « URL directe » vaut-il pour Neon

Oui, et Neon l'écrit lui même. Son guide Prisma classe : « Direct (unpooled) connection: for Prisma CLI commands (migrations, introspection) », et pour Prisma 7 renvoie vers `prisma.config.ts` : « Create a `prisma.config.ts` file in your project root. This tells Prisma CLI where to connect for migrations » ([Neon, Prisma](https://neon.com/docs/guides/prisma)). La page de pooling range aussi les migrations de schéma sous « Direct », au motif que les outils ne gèrent pas forcément le pooling par transaction ([Neon, Connection pooling](https://neon.com/docs/connect/connection-pooling)).

**Neon ne documente nulle part cet échec Prisma précis.** Ni `P1002`, ni `pg_advisory_lock(72707369)` n'apparaissent dans ses pages de connexion, de pooling ou son guide Prisma. Le lien de causalité est à faire soi même à partir de la ligne « Session-level advisory locks » de la liste des non-supportés.

## 4. Débloquer un verrou échoué

### Le diagnostic

La requête vient d'un mainteneur Prisma ([prisma/prisma#12999](https://github.com/prisma/prisma/issues/12999)) :

```sql
SELECT * FROM pg_locks pl
LEFT JOIN pg_stat_activity psa ON pl.pid = psa.pid
WHERE objid = 72707369;
```

### Ce qui ne marche pas

`pg_advisory_unlock` ne libère que ce que la session appelante détient : « Releases a previously-acquired exclusive session-level advisory lock. Returns `true` if the lock is successfully released. If the lock was not held, `false` is returned, and in addition, an SQL warning will be reported by the server. » ([PostgreSQL 17, System Administration Functions](https://www.postgresql.org/docs/17/functions-admin.html)). Depuis une autre session, l'appel renvoie `false` et un avertissement. C'est exactement le cas ici, puisque le détenteur est un backend du pooler.

Corollaire : si la requête ad hoc a été servie par le backend détenteur, `pg_advisory_unlock(72707369)` peut réussir, par coïncidence de routage. Ce n'est pas une méthode.

### Ce qui marche

**Tuer le backend détenteur.** `pg_terminate_backend(pid)` « Terminates the session whose backend process has the specified process ID. This is also allowed if the calling role is a member of the role whose backend is being terminated or the calling role has privileges of `pg_signal_backend` » ([PostgreSQL 17](https://www.postgresql.org/docs/17/functions-admin.html)). La fin de session déclenche `pg_advisory_unlock_all` implicitement, y compris sur déconnexion brutale (même page). C'est la voie sanctionnée par PostgreSQL, avec le `pid` lu dans la requête de diagnostic ci dessus.

**Redémarrer le calcul Neon.** Depuis la console ou l'API : « Restarting a compute interrupts any connections currently using the compute. » ([Neon, Manage computes](https://neon.com/docs/manage/endpoints)). Toutes les sessions tombent, donc tous les verrous consultatifs aussi. Plus brutal, mais ne demande aucun privilège Postgres.

**Attendre.** Cinq minutes d'inactivité suffisent à mettre le calcul en veille ([Neon, Scale to zero](https://neon.com/docs/introduction/scale-to-zero)).

## 5. Ce que ça implique pour ce dépôt

État constaté, sans modification :

- `prisma.config.ts` déclare `datasource: { url: env('DATABASE_URL') }`. La CLI migre donc avec la même URL que l'application.
- Le `DATABASE_URL` de `.env.development` contient `-pooler`. Les migrations passent par PgBouncer, ce qui est la cause du verrou échoué côté émetteur.
- `package.json` contient déjà un contournement : `prisma:migrate:e2e` lance `prisma migrate deploy` puis le relance en cas d'échec. Il confirme le symptôme et suit d'ailleurs le conseil de la documentation Prisma, « if your command times out, you will need to run it again ».

Les trois options, dans l'ordre où les sources primaires les soutiennent :

1. **URL non poolée pour la CLI.** C'est ce que Prisma et Neon recommandent tous les deux. Coût : une variable d'environnement de plus, à tirer de Vercel et à poser dans le secret du runner. Limite connue : cela empêche de *créer* de nouveaux verrous échoués, cela ne libère pas ceux qui existent déjà, et cela ne protège pas contre un verrou laissé par un autre chemin.
2. **`PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` sur la commande de migration.** Vérifié actif dans le binaire livré ici. Acceptable seulement si une seule migration tourne à la fois. Sur ce dépôt, `main` se déploie tout seul et le runner e2e migre aussi : ce sont deux déclencheurs distincts, donc la garantie n'est pas gratuite à énoncer.
3. **Ne rien changer et réessayer**, ce que fait déjà le script e2e. Coût : dix secondes perdues par tentative, et un échec de pipeline quand les deux tentatives tombent dans la même fenêtre de verrou.

Le choix n'est pas tranché ici, il demande une conversation.

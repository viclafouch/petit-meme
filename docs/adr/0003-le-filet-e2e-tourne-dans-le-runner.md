# Le filet e2e tourne dans le runner

Le dépôt n'avait aucun test automatisé au-delà d'un fichier Vitest, et `main` se déploie tout seul. La suite Playwright tourne sur une pull request, dans le runner GitHub, qui construit l'application et la sert avant de la tester. Le check est requis pour fusionner sur `main`. Une suite de smoke non destructive suivra chaque déploiement de production, pour couvrir ce que le runner ne peut pas voir.

## Considered Options

Un lancement en `pre-commit` ou en `pre-push` sur la machine du développeur a été écarté : il immobilise la machine plusieurs minutes et se contourne d'un `--no-verify`, c'est à dire précisément le jour où il servirait.

Tester le déploiement de preview Vercel a été écarté : la fidélité gagnée est réelle mais étroite, et elle coûte un environnement entier déclaré sur un scope Vercel, un déclenchement branché sur `deployment_status`, et un run qui dépend d'un déploiement réussi. La panne qui a motivé cette suite, un modèle Prisma en retard sur better-auth, se voit aussi bien dans le runner. Ce que le runner ne voit pas, une variable absente du scope production ou une plate-forme qui se comporte autrement, revient au smoke de production.

La suite n'emprunte l'environnement de personne. Elle sert son propre build sur `127.0.0.1:3100`, hôte distinct de celui du serveur de développement, donc jar de cookies distinct.

Un lancement contre `vite dev` a été écarté aussi : le paquet de production est l'endroit où vivent les pièges connus du projet, notamment la fuite de code serveur dans le paquet client. La suite construit donc en mode production, avec le preset Nitro `node-server` au lieu de `vercel`, pour pouvoir se servir elle même. L'adaptateur Vercel n'est donc pas exercé ici, tout le reste l'est : même code, même paquet client, même rendu serveur. L'adaptateur revient au smoke de production.

## Consequences

Toute modification passe par une branche et une pull request. Le passage en force reste possible pour l'administrateur du dépôt, il devient un geste conscient et rare.

La suite a son propre environnement, `e2e`, au même rang que `development` et `production` : un fichier `.env.e2e`, un mode Vite, un hôte, un port. Il déclare `VERCEL_ENV=development`, donc l'application s'y comporte comme en local : rate limiting de better-auth inactif, Sentry muet, cookies non sécurisés sur HTTP. En intégration continue ce fichier vient d'un secret unique, `E2E_ENV_FILE`. Une variable qui manque casse le démarrage avec l'erreur de `@t3-oss/env-core`, ce qui est lisible, et une valeur qui change se met à jour à un seul endroit.

Le seed vide la base entière à chaque run. Il ne le fait qu'après avoir vérifié que le `DATABASE_URL` du processus est bien celui que `.env.e2e` déclare, et le fichier est chargé en `override` pour qu'une variable exportée ne puisse pas le supplanter en silence.

Le dépôt est public, donc les artefacts d'un job sont téléchargeables par tout le monde. Les traces Playwright, qui contiennent les cookies de session, ne sont envoyées qu'en cas d'échec et avec une rétention de trois jours. En contrepartie, l'environnement de test ne contient jamais de donnée réelle : aucune copie de la base de production, aucune clé Stripe autre que celles du mode test. Une pull request venue d'un fork n'a pas accès aux secrets, le job ne s'y déclenche pas.

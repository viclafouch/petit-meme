# L'environnement de déploiement décide, pas `NODE_ENV`

Trois comportements dépendaient de `IS_PRODUCTION`, c'est à dire de `NODE_ENV === 'production'`, qui est vrai sur toute preview Vercel autant qu'en production : l'envoi vers Sentry, le rate limiting de better-auth, et les cookies sécurisés. Ces trois là lisent désormais l'environnement de déploiement, `VERCEL_ENV` côté serveur et `VITE_VERCEL_ENV` côté navigateur. Partout ailleurs, `NODE_ENV` reste la bonne question et `IS_PRODUCTION` ne bouge pas.

## Considered Options

Laisser Sentry actif sur les preview et filtrer par tag a été écarté : le quota est consommé de la même façon et les erreurs se mélangent aux vraies dans la même vue.

Un drapeau dédié aux tests a été écarté : l'environnement de déploiement dit déjà tout ce qu'il faut savoir, et une variable de plus est une variable qu'on peut positionner à tort en production.

## Consequences

`VERCEL_ENV` est optionnelle, et son absence retombe sur `NODE_ENV`. Vercel la fournit d'elle même, sauf si l'exposition des variables système est coupée dans les réglages du projet : dans ce cas la production garde son comportement au lieu de perdre en silence ses cookies sécurisés et son rate limiting. L'environnement `e2e` la déclare explicitement à `development`.

Sentry n'émet plus depuis une preview. Ouvrir une preview à la main ne pollue plus le monitoring de production, et en contrepartie une erreur vue là ne laisse de trace que dans les logs.

Les variables système de Vercel ne traversent pas jusqu'au navigateur, donc `vite.config.ts` recopie `VERCEL_ENV` dans `VITE_VERCEL_ENV` au moment de la construction, où Vite l'inline. Rien à déclarer à la main sur les scopes.

Cette recopie n'a pas de repli sur `NODE_ENV`, contrairement au serveur : si la variable manque, le navigateur se croit en développement et Sentry se tait. Ce que l'on perd alors est un rapport d'erreur, pas un cookie de session ni un plafond de requêtes.

Le rate limiting applicatif, celui des middlewares de `src/server/rate-limit.ts`, n'a pas de porte d'environnement et n'en reçoit pas : il s'applique partout, y compris pendant les tests. Une suite qui déclencherait ses plafonds dirait quelque chose de vrai sur le produit.

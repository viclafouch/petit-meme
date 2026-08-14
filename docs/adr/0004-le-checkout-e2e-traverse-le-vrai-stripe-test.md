# Le checkout e2e traverse le vrai Stripe en mode test

En juin 2026, la montée de better-auth en 1.6 a ajouté l'écriture de `billingInterval`, `cancelAt` et `canceledAt` sur le modèle `Subscription`. Les colonnes Prisma manquaient, le callback de retour de checkout répondait 500, et des Visitors ont payé sans jamais obtenir leur Premium. Le test qui garde ce chemin remplit donc la vraie page Stripe Checkout en mode test, avec la carte `4242 4242 4242 4242`, et non une simulation.

## Considered Options

Simuler Stripe en interceptant le réseau a été écarté par l'incident lui-même : la panne était dans le code que better-auth exécute au retour du navigateur, pas dans l'appel sortant. Une simulation aurait laissé passer la régression exactement telle qu'elle s'est produite.

## Consequences

La page Stripe Checkout appartient à un tiers et change d'apparence sans préavis. Le test la traverse mais n'affirme presque rien sur elle : tout ce qui est vérifié sérieusement se passe après la redirection, à savoir que `/checkout/success` rend son titre, que la ligne `Subscription` porte les valeurs attendues, et que le User est effectivement Premium à la requête suivante.

Le webhook n'est pas nécessaire à ce test, et le mode test ne doit en déclarer aucun. `/api/auth/subscription/success` récupère la session Stripe et écrit la souscription en synchrone, au retour du navigateur, ce qui rend l'assertion immédiate et dispense d'exposer au monde une URL de webhook depuis le runner. Un endpoint déclaré en mode test livrerait les événements des runs à l'application qu'il vise, la production comprise. Tout ce qui arrive plus tard par webhook, la résiliation, le renouvellement, l'échec de paiement, sort donc du périmètre e2e et revient aux tests d'intégration.

Le seed ne supprime rien chez Stripe. Un client supprimé laisse un identifiant qui lui survit, que better-auth repasse ensuite à Stripe, lequel répond `resource_missing` et refuse le checkout. Les clients du mode test s'accumulent donc, ce qui ne coûte rien, et la base repart de zéro à chaque run, ce qui suffit à ce que l'application ne voie aucun abonnement.

Les identifiants de la page Stripe sont ses propres `data-testid`, jamais ses libellés, qui changent avec la langue. Le formulaire de carte se déplie derrière un sélecteur de moyen de paiement dès que le navigateur annonce un portefeuille, ce qu'un Mac fait et pas un runner Linux : le test l'ouvre seulement si le champ n'est pas déjà là.

# Un Event est attribué à l'instant où il se produit

L'attribution d'un Event est figée à l'écriture et n'est jamais révisée : un Visitor anonyme qui crée ensuite un compte ne récupère pas les Events qu'il a produits avant son inscription. Rattacher a posteriori les Events d'une même adresse à un nouveau compte aurait donné le parcours complet menant à l'inscription, mais aurait attribué à une personne ce qu'une autre a fait derrière la même connexion familiale ou professionnelle.

## Consequences

La fiche d'un User commence à son inscription, jamais avant. Pour reconstituer le parcours qui a précédé, il faut chercher l'adresse à la main dans l'Activity, et seulement dans les 30 jours pendant lesquels elle est conservée.

Un Event n'est jamais mis à jour après son écriture. Toute évolution du modèle qui supposerait le contraire est à considérer comme une rupture de cette décision.

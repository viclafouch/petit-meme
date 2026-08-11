# Plan : le rappel premium écrase la modale de téléchargement (2026-08-11)

**Statut : corrigé.** `pnpm run lint:fix` passe.

## Symptôme

Utilisateur connecté sans abonnement, sur une page de mème. Il clique sur « Télécharger »,
la modale d'upsell watermark s'ouvre (« télécharger quand même avec le filigrane »), puis
quelques secondes plus tard une autre modale la remplace : le rappel premium.

## Cause

Trois défauts qui se cumulent.

1. **Le store de dialogs n'a qu'un seul emplacement.** `showDialog()` dans
   `src/stores/dialog.store.tsx` remplace `component` et `componentProps` sans vérifier
   qu'une modale est déjà ouverte. Aucune pile, aucune file d'attente, aucune priorité.

2. **Le rappel premium est la seule modale autonome.** `usePremiumReminder` arme un
   `setTimeout` de 5 s au montage du layout `/memes*`. Tous les autres appels à
   `showDialog()` partent d'un clic, donc d'un écran libre. Un clic sur « Télécharger »
   dans cette fenêtre de 5 s provoque l'écrasement.

3. **Les conditions étaient évaluées à l'armement du minuteur, pas à son déclenchement.**
   Un abonné dont la requête `activeSubscription` n'était pas encore résolue au montage
   recevait le rappel 5 s plus tard, alors qu'il paie.

Défaut de conception associé : le rappel premium et l'upsell watermark vendent la même
offre avec le même appel à l'action `/pricing`, sans aucune coordination entre eux.

## Correctif

- [x] `src/stores/dialog.store.tsx` — extraction de `matchIsDialogOpen(state)`, seule
      source de vérité de l'état ouvert. `useIsDialogOpen` l'utilise comme sélecteur.

- [x] `src/hooks/use-premium-reminder.ts` — les conditions passent dans le rappel du
      minuteur. Si une modale est ouverte au déclenchement, le rappel ne s'affiche pas :
      le minuteur est réarmé pour un nouvel essai. Lecture impérative du store via
      `useDialog.getState()` pour ne pas réarmer l'effet à chaque changement d'état.

- [x] `snoozePremiumReminder()` est appelé au moment où une offre premium est présentée,
      et non plus à la fermeture de la modale. Trois emplacements, chacun collé à son
      `showDialog()` : le rappel lui-même (`use-premium-reminder.ts`), l'upsell watermark
      (`src/hooks/use-meme-export.ts`) et l'upsell recherche IA
      (`.../memes/-components/ai-search-page.tsx`). Les deux upsells vendent la même offre
      avec le même appel à l'action `/pricing` : sans ce report, le réarmement du minuteur
      ferait apparaître le rappel juste après la fermeture de l'upsell, soit deux fois la
      même offre en quelques secondes.

- [x] `src/components/premium-reminder-dialog.tsx` — l'enveloppe `handleOpenChange`
      disparaît, `onOpenChange` est passé directement. Le report ne dépend plus d'une
      fermeture explicite : un utilisateur qui quitte la page sans fermer la modale est
      maintenant couvert par le délai de garde.

Aucune modification de schéma Prisma, aucune migration. Aucune dépendance ajoutée.

## Non fait, volontairement

Le store reste à un seul emplacement. Une pile de modales n'a pas d'usage ici : le rappel
premium était la seule source autonome, les dix autres appels à `showDialog()` viennent
d'un clic. Le garde-fou est donc posé du côté de l'appelant autonome, pas dans le store.

Pas de test unitaire : le correctif porte sur un effet à minuteur couplé à un store
Zustand, et le dépôt n'a pas de bibliothèque de test de rendu React. Le prédicat extrait
`matchIsDialogOpen` est trop trivial pour justifier un fichier de test à lui seul.

Le motif déclaratif de `cookie-banner.tsx` (`useTimeout` + `useIsDialogOpen()`, rendu
conditionnel) n'est pas repris. Il conviendrait à une bannière, qui est une feuille de
l'arbre. Ici l'appelant est le layout `_public__root/_default`, qui enveloppe toutes les
pages : l'abonner au store ferait rendre à nouveau tout le sous-arbre à chaque ouverture ou
fermeture de modale, y compris sur les pages sans rapport. La lecture impérative par
`useDialog.getState()` n'abonne rien. Le coût est un minuteur toutes les 5 s tant qu'une
modale reste ouverte, soit quelques lectures en mémoire, négligeable dans un navigateur.

Le report du rappel n'est pas posé dans `premium-upsell-dialog.tsx`. Ce composant est un
gabarit générique piloté par ses props ; y cacher une règle métier d'une autre
fonctionnalité inverserait le sens de la dépendance et contaminerait tout futur usage du
gabarit. Le report est donc appelé aux deux points de déclenchement.

## Vérification manuelle

1. Compte sans abonnement, `localStorage.removeItem('premium-reminder-dismissed-at')`.
2. Ouvrir un mème, cliquer sur « Télécharger » avant la 5e seconde.
3. La modale watermark reste ouverte. Le rappel premium ne s'affiche pas, ni pendant, ni
   après sa fermeture (délai de garde posé au montage de l'upsell).
4. Sans toucher à rien pendant 5 s sur une page de mème : le rappel s'affiche bien.
5. Compte avec abonnement : aucun rappel, y compris quand la requête d'abonnement se
   résout après le montage de la page.

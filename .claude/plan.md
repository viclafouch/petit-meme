# Plan : overlay du cookie banner bloquant les clics au premier chargement (2026-07-27)

**Statut : corrigé.** `pnpm run lint:fix` passe.

## Symptôme

Sur une première visite, aucun bouton de la page n'est cliquable pendant ~3,5 s, puis
l'interface redevient utilisable au moment où la bannière de cookies apparaît.

## Cause

`src/components/cookie-consent/cookie-banner.tsx` appliquait le délai d'apparition à
l'**animation** et non au **montage** :

```tsx
initial={{ opacity: 0 }}
animate={{ opacity: 1, transition: { delay: APPEAR_DELAY_S, duration: 0.3 } }}
className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
```

L'overlay était donc présent dans le DOM dès le premier rendu, en `fixed inset-0 z-50`.
`opacity: 0` ne retire pas un élément du hit-testing : la div interceptait tous les clics
de la page pendant toute la durée du délai.

`isBannerVisible` valant `true` dès le montage du provider pour un visiteur sans consentement
enregistré, le problème ne touchait que les nouveaux arrivants — cohérent avec le rapport.

## Correctif

- [x] Nouveau hook bas niveau `src/hooks/use-timeout.ts` — `{ callback, delayMs, isEnabled }`,
      `clearTimeout` au cleanup. Le callback passe par `React.useEffectEvent` : sans ça il
      faudrait le mettre en dépendance, et comme il est recréé à chaque rendu (le projet
      interdit `useCallback` sans problème de perf mesuré) le timer redémarrerait sans cesse
      et l'échéance ne tomberait jamais. Seuls `delayMs` et `isEnabled` sont en dépendances.

      `useEffectEvent` est stable depuis React 19.2 (installé : 19.2.8) et l'appel asynchrone
      depuis un `setTimeout` est le motif documenté dans « Separating Events from Effects ».
      La contrainte « top level d'un composant ou de tes propres Hooks » est respectée.
      Écrit `React.useEffectEvent` et non l'import destructuré, conformément à
      `.claude/rules/frontend.md`.
- [x] `CookieBanner` consomme `useTimeout` directement avec un `useState` local. Pas de hook
      `useDelayedAppearance` intermédiaire : il n'aurait fait qu'envelopper `useTimeout` sans
      rien ajouter.
- [x] `CookieBanner` monte l'overlay et le panneau seulement quand
      `isBannerVisible && hasDelayElapsed`. Rien dans le DOM avant l'échéance, donc plus rien
      à intercepter.
- [x] `delay` retiré des deux transitions `motion` (overlay + slide) : le délai est désormais
      porté par le montage, le cumuler aurait doublé l'attente.
- [x] `APPEAR_DELAY_S = 3.5` → `APPEAR_DELAY_MS = 3500` (le hook prend des millisecondes).
- [x] `BannerMedia` : suppression du `videoRef` et de l'effet de lecture différée, remplacés
      par l'attribut `autoPlay`. Le composant ne se monte plus qu'au moment voulu, la lecture
      manuelle après timer n'a plus de raison d'être. `muted` + `playsInline` sont déjà là,
      l'autoplay reste autorisé par les navigateurs.

## Correctif 2 — bannière rendue derrière la modale de connexion

`AuthDialog` utilise le `Dialog` Radix sans prop `modal`, donc `modal={true}`. Radix applique
alors à tout ce qui est hors du portail : `pointer-events: none` sur `<body>`,
`aria-hidden="true"` sur les frères du portail, et un piège de focus. La bannière étant rendue
dans l'arbre normal (`__root.tsx:72`), la faire passer devant via le z-index l'aurait rendue
**visible mais inerte** — boutons non cliquables, invisible aux lecteurs d'écran, hors du
parcours clavier.

- [x] `useIsDialogOpen()` ajouté à `src/stores/dialog.store.tsx`. Le prédicat est
      `componentProps?.open === true` et non `component !== null` : `closeDialog` ne remet pas
      `component` à `null` (seul `forceCloseDialog` le fait), donc `component` reste non-nul
      après la première ouverture et ne dit rien de l'état réel.
- [x] `CookieBanner` gate son montage sur `!isDialogOpen`. La bannière attend la fermeture du
      dialogue au lieu de se superposer.

Sens unique en pratique : tant que la bannière est affichée, son overlay couvre la page, donc
aucun dialogue ne peut être ouvert par un clic. Le cas inverse ne se produit que pour un
dialogue déclenché par timer (`premium-reminder`), où `AnimatePresence` joue la sortie.

## Vérifié

- Aucun autre overlay plein écran monté inconditionnellement : `player-dialog.tsx` et
  `animate-ui/radix/dialog.tsx` sont tous deux conditionnés par un état d'ouverture.

## Non traité (à arbitrer)

- La bannière n'expose que « Personnaliser » et « Accepter ». La CNIL demande que refuser soit
  aussi simple qu'accepter ; un bouton « Refuser » de même niveau serait à ajouter. Hors
  périmètre de ce correctif.

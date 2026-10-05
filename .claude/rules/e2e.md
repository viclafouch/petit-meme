---
paths:
  - "e2e/**/*.ts"
---

## End to End Rules

These rules cover the Playwright suite under `e2e/`, its specs and its helpers.

### Hydration

A page is server rendered before React attaches, and Playwright cannot tell the difference. The first click on a freshly loaded page can be lost, and so can the first fill, whose text stays in the field while nothing on the page was told about it. Wrap that first action, and nothing after it, in a helper of `e2e/hydration.ts`. Each one repeats the whole sequence until a signal that only the action can produce shows up:

- `repeatUntilVisible` when the result appears on screen and stays there.
- `repeatUntilNavigated` when the screen showed the result before the action. A search for a Meme the unfiltered page already carries proves nothing on screen, so the query reaching the URL is the signal.
- `repeatUntilRequested` when nothing on screen lasts. It repeats only when no request left, so the server never sees a double.

A repeated fill has to change the value to carry: React reads the input on arrival and tracks what it finds there, so typing the same text a second time is a change for nobody. Clear the field before every attempt.

A helper whose action is always the first one of a freshly loaded page, `openMemePlayer` for one, carries the repeat itself.

After an optimistic update, wait on the response that settles the write, never on the screen, which turned before the write landed. Picking an Avatar waits for the session refresh: better-auth caches the session in a signed cookie for five minutes, and a reload before that refresh reads the Avatar from before the click.

### Locators

Name what a test clicks the way a screen reader announces it, with `m` from `e2e/messages.ts`, never with a copy of the string. That module pins the message resolver on the e2e locale, since the test process has no request to read it from, and it is the locale the Playwright project pins on the browser.

An accessible name matches by substring unless `exact: true` says otherwise. Pass it whenever a name can sit inside another one on the page: two filler titles that differ by a number, avatar slot one inside slots ten to nineteen, « Texte » inside the label of the Studio phone bar, « Modifier » inside « Modifier mon mot de passe », an announcement of three Memes inside one of fifty three. When the name carries the assertion, `exact` is what makes it mean something.

When the same name appears in several places, scope the locator to the landmark or panel that holds the one you mean. The Settings page looks inside `main`, since its header dropdown, its phone navigation and its dialogs repeat the names of its buttons. The header sign in button is looked for inside `banner`, since the submit button of the open dialog carries the same name. The auth dialog keeps both panels mounted to animate its height, so its buttons are looked for inside the active `tabpanel`.

Count the Memes on screen by their play buttons, with `getMemePlayButtons`. Every card carries exactly one and nothing else on the page does, while a card holds several links to the same Meme.

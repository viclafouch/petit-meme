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

### Accounts and third parties

A spec that needs a signed in User, and is not about signing in, starts from the storage state `auth.setup.ts` writes for its role. That setup signs every verified role in over the HTTP API rather than through the dialog: the login screen has its own specs, every other spec only needs the cookie, and the sign in also proves the seeded rows are the ones better-auth expects. The unverified role is never signed in and gets no storage state, since only the login screen has something to say about it.

A scenario that leaves a mark on its account gets its own role in `E2E_ROLES`. Sharing one between a checkout and a deletion would make the second test depend on the order of the first.

A page that belongs to a third party, the Stripe billing portal or an OAuth provider, is never crossed. Route its origin to `abort()`, stop at the door and check that the door is the right one: the request that leaves names a billing portal session by its path, since any Stripe page answers the origin alone, and an OAuth request carries the way back to our own callback rather than to whatever origin the run happens to use.

### Public surfaces

A surface open to everyone, the home page, the library, a Category, a legal page, is walked as an anonymous Visitor with no storage state: nothing there is supposed to ask for an account. A surface that also serves signed in Users, the Studio for one, keeps at least one anonymous test, which proves it opens without an account as the free library promises. A route that answers machines rather than Visitors, a sitemap, `robots.txt`, the manifest, is checked through `request`, with no browser.

### Assertions

An assertion has to be able to fail.

- An absence is asserted on something that would be there otherwise: a Meme of the other Category, whose view count would put it on any first page.
- A check over a list comes with a check that the list is not empty. An empty sitemap would let the leak check pass without covering anything.
- A filter is checked on a page that stays full after it. Dropping French still leaves a page of English and Universal Memes, while a filter that answered nothing would satisfy every other assertion.
- A page cut names the Memes on both sides of it, since the count alone would hold for any Memes.
- A page that does not exist is checked for its 404 status, since a soft 404 offers Google an empty page to index under a real status.

The expected value comes from the source the page serves, never from a copy kept in the spec: a copy stays green the day a locale serves the other one's text. Strings come from `m`. The title of a legal page comes from its markdown file, one per locale, which the route picks from the locale of the URL. The avatar style credit is the one exception. Its value is a legal obligation rather than a product choice, the credit and its two links, so the spec writes it out instead of reading it from the markdown.

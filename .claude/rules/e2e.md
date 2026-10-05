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

The suite mints the email verification link, and reads the password reset token back. better-auth signs the email verification token as a JWT and stores nothing. The password reset token does leave a `verification` row: the token is the tail of its identifier, and its value names the User. With no verification token to read back, `buildEmailVerificationUrl` signs the one the email would have carried with the e2e secret, and everything that URL then triggers is the real route.

A scenario that leaves a mark on its account gets its own role in `E2E_ROLES`. Sharing one between a checkout and a deletion would make the second test depend on the order of the first.

A page that belongs to a third party, the Stripe billing portal or an OAuth provider, is never crossed. Route its origin to `abort()`, stop at the door and check that the door is the right one: the request that leaves names a billing portal session by its path, since any Stripe page answers the origin alone, and an OAuth request carries the way back to our own callback rather than to whatever origin the run happens to use.

A checkout pays with `STRIPE_TEST_CARD`, the Visa that [Stripe lists for testing](https://docs.stripe.com/testing). It is not enrolled in 3D Secure, so no authentication step stands between the payment and the way back to the site.

### Fixtures

Every test starts with the prompts that open on their own already answered. `fixtures.ts` answers the consent banner, snoozes the Premium reminder and dismisses the locale banner before the first page loads. All three speak on their own, `PREMIUM_REMINDER_DELAY_MS` into a `/memes` page for the reminder and on sight of an `/en/` page for the locale banner, and a prompt that opens in the middle of a scenario steals the click that scenario was about to make. Each has its own spec, and no other spec should have to walk past them.

An uncaught error on one of our pages fails the test that saw it. One such error kills hydration, which leaves buttons that look perfect and do nothing, and it surfaces minutes later as a timeout with no clue about the cause. Errors raised by third party pages, Stripe above all, are not ours to judge, so `fixtures.ts` only collects the ones whose page sits under the base URL.

### Seeded content

The content is sized by the counts the suite asserts. The library shows `MEMES_PER_PAGE` Memes per page, and both locales need a second page to walk to. `content.ts` seeds `FILLER_MEME_COUNT` fillers, most of them Universal, because the English library only sees English and Universal Memes and holds fewer than the French one. The first page of `trending` falls back on view counts when no Event exists, so every fixture carries a distinct view count and the named Memes hold the highest, which keeps them on that page whatever the fillers do. Every other page of the library reads Algolia, so the seed indexes every Meme it writes: a Meme left in the database alone is invisible to most of the suite.

The content is dated so that no order depends on the run. A seeded Meme is created at the instant it was published. Left to its default, `createdAt` would be the instant of a parallel insert, which gives the index sorted on it no stable order. The news Category and the home announcement read the same window, `THIRTY_DAYS_MS`, and `E2E_RECENT_MEMES` counts the Memes inside it from that same constant, with no fixture near its edge. Seeded Bookmarks are dated outside the trending window, and a test that adds one puts it on the most viewed Meme, the one a fresh Bookmark cannot move out of trending.

One Meme alone carries a Video that exists at Bunny. `E2E_NAMED_MEMES.mostViewed` points at the one Video of the `e2e` Bunny library. Every other fixture carries a made up id, which is enough for a list, a thumbnail slot and a page, and never enough to play or to Export. That id is `E2E_VIDEO_BUNNY_ID` in `.env.e2e` rather than a literal in `content.ts`, because it names a resource of that library and recreating the library gives it another one. A spec that needs a real file, the Studio first, uses that Meme. A spec that cannot pick its Meme, Reels and its random order, asserts that the request for the file leaves: a Premium taken for a free User gets the upsell dialog instead, and nothing goes out.

The seed sets its own timeout, `SEED_TIMEOUT_MS`, wider than the one `playwright.config.ts` gives a test: it empties a database, writes every Meme and waits for Algolia to swap the index of each locale.

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

# Shipping

Petit Meme has one developer, the Creator, and no staging environment. A change reaches production only when the automated checks pass.

## How a change reaches production

1. **The change is written.** A bigger topic starts from a GitHub issue, which holds the plan and its "Done when". A small change goes without one.
2. **Checks run before the commit.** Types, lint, unused code, unit tests and formatting run on the Creator's machine.
3. **The change goes out, on the Creator's word.** A bigger topic goes through a pull request, which merges on its own once the checks pass. A small change goes straight to the main branch.
4. **The checks run again.** The same checks, plus the end-to-end tests in a real browser against a test database.
5. **Production follows.** Vercel builds every change, but holds production on the previous version until every check is green. A red check leaves production untouched.

The end-to-end tests share one test database and one account per audience, so two runs never overlap: the second waits for the first.

## What the Creator does by hand

- **Database changes.** The Creator applies them to production before the code that needs them ships. Changes only add: a new optional field, a new table, a new index. Nothing gets dropped or renamed, because production data is real.
- **Platform settings.** A change goes to development first, then to the test environment, then to production. The production step is the Creator's.
- **The final look.** Some checks only a person can make: how a screen looks on an iPhone and on a desktop, how a video plays on Safari. The Creator makes them after a release.

## Previews

Each change gets a preview on Vercel. Today a preview still uses the production services, so isolating it is planned.

## What the Creator hears about

- **Each sign-up and each payment**: a notification from the Stripe app.
- **Each week**: the weekly recap by email. It holds tables only, with this week's figures and the change from the week before. The rows cover accounts, views, exports, subscriptions and money.
- **Regularly**: a reminder of the Meme proposals waiting for a decision.
- **Errors**: Sentry. The Creator asks for a review of the latest errors from time to time.

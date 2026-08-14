# Specs

Working area for the Playwright agents. The planner writes a Markdown plan here, the generator turns it into a test.

What to test, in which order, and what stays out of the e2e suite is decided in [`docs/testing/e2e-plan.md`](../docs/testing/e2e-plan.md). A plan written here covers one surface of that document, it never redefines the perimeter.

Generated tests go to `e2e/`, next to the existing suite, with the `.spec.ts` extension.

Two seeds, do not confuse them. `e2e/seed.spec.ts` is the one the agents replay: it puts the
browser in the state every scenario starts from. `e2e/seed.setup.ts` prepares the database and
runs before everything else.

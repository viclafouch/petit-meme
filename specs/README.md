# Specs

Working area for the Playwright agents. The planner writes a Markdown plan here, the generator turns it into a test.

What to test and what stays out is decided in the conversation, and the suite in `e2e/` is the record of it. Read the specs next to the one you are adding before writing: they carry the conventions.

Generated tests go to `e2e/`, next to the existing suite, with the `.spec.ts` extension.

Two seeds, do not confuse them. `e2e/seed.spec.ts` is the one the agents replay: it puts the
browser in the state every scenario starts from. `e2e/seed.setup.ts` prepares the database and
runs before everything else.

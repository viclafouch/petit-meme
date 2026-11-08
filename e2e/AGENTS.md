# End-to-end tests

- The suite targets the Neon `test` branch, which e2e runs are free to write.
- Each role is one shared account, so `--repeat-each` runs with `--workers=1`.
- Two seeds: `seed.setup.ts` prepares the database and runs before everything else. `seed.spec.ts` puts the browser in the state every scenario starts from, and the Playwright agents replay it.
- Reduced motion stays on: it keeps the suite fast.
- A flaky test that blocks a PR gets fixed in that PR.

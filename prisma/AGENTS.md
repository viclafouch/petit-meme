# Migrations

Production data is real, so a migration only adds: a new optional column, a new column with a default, a new table, a new index. Dropping, renaming and resetting stay off the table.

1. Read the generated SQL before anything runs: a migration that looks additive can still rewrite rows.
2. Hand Victor the commands in order, with the environment each one hits and what happens to the rows that already exist.
3. Production migrates before the code that needs it ships, otherwise the new code reads a missing column. Development migrates too. The `e2e` workflow migrates the test branch on its own.

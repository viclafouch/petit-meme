---
paths:
  - "**/*.{test,spec}.ts"
  - "**/__tests__/**"
---

## Testing Rules

These rules cover the unit and integration tests run by Vitest, `**/*.test.ts`.

End to end tests are `**/*.spec.ts` under `e2e/` and answer to different rules: one scenario
per test, a scenario carrying as many assertions as the flow needs, and no mocking, since the
point is to exercise the real thing. The suite itself is the record of what is covered.

An e2e assertion is taken on screen, never by polling the database to check that the test worked.

### Structure
- Use BDD-style comments: #given, #when, #then
- One logical assertion per test
- Descriptive test names that explain the scenario

### Mocking
- Mock external dependencies (APIs, databases)
- Don't mock the unit under test
- Reset mocks between tests

### Coverage
- Test happy path AND error cases
- Test edge cases (empty, null, boundary values)
- Test async behavior (loading, success, error states)

### Example

```typescript
describe("UserService", () => {
  describe("getUser", () => {
    it("should return user when found", async () => {
      // #given
      const mockUser = { id: "1", name: "Test" }
      mockDb.findById.mockResolvedValue(mockUser)

      // #when
      const result = await userService.getUser("1")

      // #then
      expect(result).toEqual(mockUser)
    })
  })
})
```
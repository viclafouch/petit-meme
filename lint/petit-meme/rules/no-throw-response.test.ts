import { testRule } from '../rule-tester.ts'
import { noThrowResponse } from './no-throw-response.ts'

testRule({
  name: 'no-throw-response',
  rule: noThrowResponse,
  tests: {
    valid: ["throw new Error('Forbidden')", "return new Response('ok')"],
    invalid: [
      {
        code: "throw new Response('Forbidden', { status: 403 })",
        errors: [{ messageId: 'throwResponse' }]
      },
      {
        code: "throw Response.json({ error: 'Forbidden' })",
        errors: [{ messageId: 'throwResponse' }]
      }
    ]
  }
})

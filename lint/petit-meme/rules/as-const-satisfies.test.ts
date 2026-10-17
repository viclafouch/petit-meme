import { testRule } from '../rule-tester.ts'
import { asConstSatisfies } from './as-const-satisfies.ts'

testRule({
  name: 'as-const-satisfies',
  rule: asConstSatisfies,
  tests: {
    valid: [
      "const ITEMS = ['a'] as const satisfies readonly string[]",
      'const pair = () => { return [1, 2] as const }'
    ],
    invalid: [
      {
        code: "const ITEMS = ['a'] as const",
        errors: [{ messageId: 'asConst' }]
      },
      {
        code: 'const MAP = { a: 1 } as const',
        errors: [{ messageId: 'asConst' }]
      }
    ]
  }
})

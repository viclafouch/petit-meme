import { testRule } from '../rule-tester.ts'
import { optionalLast } from './optional-last.ts'

testRule({
  name: 'optional-last',
  rule: optionalLast,
  tests: {
    valid: [
      'type ButtonProps = { label: string; isActive?: boolean }',
      'type Settings = { isActive?: boolean; label: string }'
    ],
    invalid: [
      {
        code: 'type ButtonProps = { isActive?: boolean; label: string }',
        errors: [{ messageId: 'optional' }]
      },
      {
        code: 'type SendParams = { cc?: string; to: string }',
        errors: [{ messageId: 'optional' }]
      }
    ]
  }
})

import { testRule } from '../rule-tester.ts'
import { childReturnsNull } from './child-returns-null.ts'

testRule({
  name: 'child-returns-null',
  rule: childReturnsNull,
  tests: {
    valid: [
      'const Badge = () => { return <span /> }',
      'const getLabel = (value: string) => { if (!value) { return null } return value }',
      'const Badge = () => { const render = function () { return null }; return <span>{render()}</span> }'
    ],
    invalid: [
      {
        code: 'const Badge = ({ count }: BadgeProps) => { if (count === 0) { return null } return <span>{count}</span> }',
        errors: [{ messageId: 'returnNull' }]
      },
      {
        code: 'function Badge({ count }: BadgeProps) { if (count === 0) { return null } return <span>{count}</span> }',
        errors: [{ messageId: 'returnNull' }]
      }
    ]
  }
})

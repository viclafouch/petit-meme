import { testRule } from '../rule-tester.ts'
import { destructureInSignature } from './destructure-in-signature.ts'

testRule({
  name: 'destructure-in-signature',
  rule: destructureInSignature,
  tests: {
    valid: [
      'const build = ({ name }: BuildParams) => { return name }',
      'const build = (params: BuildParams) => { const { name } = other; return name }'
    ],
    invalid: [
      {
        code: 'const build = (params: BuildParams) => { const { name } = params; return name }',
        errors: [{ messageId: 'destructure' }]
      }
    ]
  }
})

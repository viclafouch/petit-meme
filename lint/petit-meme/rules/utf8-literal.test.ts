import { testRule } from '../rule-tester.ts'
import { utf8Literal } from './utf8-literal.ts'

const NO_BREAK_SPACE_CODE_POINT = 160
const NO_BREAK_SPACE = String.fromCodePoint(NO_BREAK_SPACE_CODE_POINT)

testRule({
  name: 'utf8-literal',
  rule: utf8Literal,
  tests: {
    valid: [
      "const label = 'Début'",
      "const NO_BREAK_SPACE = '\\u00A0'",
      "const pattern = '\\\\u0041'"
    ],
    invalid: [
      {
        code: "const label = 'D\\u00e9but'",
        errors: [{ messageId: 'escape' }]
      },
      {
        code: `const label = 'a${NO_BREAK_SPACE}b'`,
        errors: [{ messageId: 'invisible' }]
      }
    ]
  }
})

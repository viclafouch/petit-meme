import { testRule } from '../rule-tester.ts'
import { jsxBlankLine } from './jsx-blank-line.ts'

testRule({
  name: 'jsx-blank-line',
  rule: jsxBlankLine,
  tests: {
    valid: [
      'const List = () => { return (\n<div>\n<span />\n<span />\n</div>\n) }'
    ],
    invalid: [
      {
        code: 'const List = () => { return (\n<div>\n<span />\n\n<span />\n</div>\n) }',
        output:
          'const List = () => { return (\n<div>\n<span />\n<span />\n</div>\n) }',
        errors: [{ messageId: 'blank' }]
      }
    ]
  }
})

import { testRule } from '../rule-tester.ts'
import { noReExport } from './no-re-export.ts'

testRule({
  name: 'no-re-export',
  rule: noReExport,
  tests: {
    valid: [
      'export const value = 1',
      "import { value } from './value'\nexport const double = value * 2"
    ],
    invalid: [
      {
        code: "export { value } from './value'",
        errors: [{ messageId: 'reExport' }]
      },
      { code: "export * from './value'", errors: [{ messageId: 'reExport' }] },
      {
        code: "import { value } from './value'\nexport { value }",
        errors: [{ messageId: 'reExport' }]
      }
    ]
  }
})

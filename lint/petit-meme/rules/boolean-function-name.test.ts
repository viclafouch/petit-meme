import { testRule } from '../rule-tester.ts'
import { booleanFunctionName } from './boolean-function-name.ts'

testRule({
  name: 'boolean-function-name',
  rule: booleanFunctionName,
  tests: {
    valid: [
      "const matchIsText = (value: unknown): value is string => { return typeof value === 'string' }",
      "const matchHasName = (value: object): value is { name: string } => { return 'name' in value }",
      "const texts = values.filter((value): value is string => { return typeof value === 'string' })",
      "const checkText = (value: unknown) => { return typeof value === 'string' }"
    ],
    invalid: [
      {
        code: "const isText = (value: unknown): value is string => { return typeof value === 'string' }",
        errors: [{ messageId: 'booleanFunction' }]
      },
      {
        code: "function isText(value: unknown): value is string { return typeof value === 'string' }",
        errors: [{ messageId: 'booleanFunction' }]
      }
    ]
  }
})

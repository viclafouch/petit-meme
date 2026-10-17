import { testRule } from '../rule-tester.ts'
import { booleanName } from './boolean-name.ts'

testRule({
  name: 'boolean-name',
  rule: booleanName,
  tests: {
    valid: [
      'const isOpen = count > 0',
      "const IS_PRODUCTION = mode === 'production'",
      'const [isOpen, setIsOpen] = React.useState(false)',
      'const total = count + 1'
    ],
    invalid: [
      { code: 'const open = count > 0', errors: [{ messageId: 'boolean' }] },
      { code: 'const visible = !hidden', errors: [{ messageId: 'boolean' }] },
      {
        code: 'const ready = matchIsReady(value)',
        errors: [{ messageId: 'boolean' }]
      },
      {
        code: 'const [open, setOpen] = React.useState(false)',
        errors: [{ messageId: 'boolean' }]
      }
    ]
  }
})

import { testRule } from '../rule-tester.ts'
import { functionalUpdate } from './functional-update.ts'

testRule({
  name: 'functional-update',
  rule: functionalUpdate,
  tests: {
    valid: [
      'const [count, setCount] = React.useState(0)\nsetCount((previous) => { return previous + 1 })',
      'const [count, setCount] = React.useState(0)\nsetCount(total)',
      'const [count, setCount] = React.useState(0)\nsetCount(settings.count)'
    ],
    invalid: [
      {
        code: 'const [count, setCount] = React.useState(0)\nsetCount(count + 1)',
        errors: [{ messageId: 'functional' }]
      },
      {
        code: 'const [isOpen, setIsOpen] = React.useState(false)\nsetIsOpen(!isOpen)',
        errors: [{ messageId: 'functional' }]
      }
    ]
  }
})

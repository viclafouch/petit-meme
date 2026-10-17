import { testRule } from '../rule-tester.ts'
import { tailwindClasses } from './tailwind-classes.ts'

testRule({
  name: 'tailwind-classes',
  rule: tailwindClasses,
  tests: {
    valid: [
      'const Box = () => { return <div className="data-active:bg-primary data-[state=open]:bg-muted hover:bg-accent" /> }',
      "const label = 'max-h-[40dvh]'"
    ],
    invalid: [
      {
        code: 'const Box = () => { return <div className="max-h-[40dvh]" /> }',
        errors: [{ messageId: 'arbitraryValue' }]
      },
      {
        code: "const classes = cn('sm:w-[24rem]', className)",
        errors: [{ messageId: 'arbitraryValue' }]
      },
      {
        code: 'const Box = () => { return <div className="data-[active]:bg-primary" /> }',
        errors: [{ messageId: 'dataShorthand' }]
      },
      {
        code: 'const Box = () => { return <div className="hover:scale-105" /> }',
        errors: [{ messageId: 'hoverTransform' }]
      }
    ]
  }
})

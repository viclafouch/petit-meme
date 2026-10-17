import { testRule } from '../rule-tester.ts'
import { externalLink } from './external-link.ts'

testRule({
  name: 'external-link',
  rule: externalLink,
  tests: {
    valid: [
      'const Link = () => { return <a href="https://stripe.com" target="_blank" rel="noreferrer">Stripe</a> }',
      'const Link = () => { return <a href="/pricing">Pricing</a> }'
    ],
    invalid: [
      {
        code: 'const Link = () => { return <a href="https://stripe.com">Stripe</a> }',
        errors: [{ messageId: 'external' }]
      },
      {
        code: 'const Link = () => { return <a href={`https://x.com/viclafouch`}>X</a> }',
        errors: [{ messageId: 'external' }]
      }
    ]
  }
})

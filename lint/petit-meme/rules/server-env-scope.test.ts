import { testRule } from '../rule-tester.ts'
import { serverEnvScope } from './server-env-scope.ts'

testRule({
  name: 'server-env-scope',
  rule: serverEnvScope,
  tests: {
    valid: [
      'const getStripe = () => { return new Stripe(serverEnv.STRIPE_SECRET_KEY) }'
    ],
    invalid: [
      {
        code: 'const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY)',
        errors: [{ messageId: 'serverEnv' }]
      }
    ]
  }
})

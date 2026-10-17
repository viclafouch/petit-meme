import { testRule } from '../rule-tester.ts'
import { routeHead } from './route-head.ts'

testRule({
  name: 'route-head',
  rule: routeHead,
  tests: {
    valid: [
      {
        code: "export const Route = createFileRoute('/pricing')({ component: PricingPage, head: () => { return seo({ title }) } })",
        filename: '/repo/src/routes/pricing.tsx'
      },
      {
        code: "export const Route = createFileRoute('/_public__root/_default')({ component: DefaultLayout })",
        filename: '/repo/src/routes/_public__root/_default/route.tsx'
      },
      {
        code: "export const Route = createFileRoute('/admin/users')({ component: UsersPage })",
        filename: '/repo/src/routes/admin/users/index.tsx'
      }
    ],
    invalid: [
      {
        code: "export const Route = createFileRoute('/pricing')({ component: PricingPage })",
        filename: '/repo/src/routes/pricing.tsx',
        errors: [{ messageId: 'head' }]
      }
    ]
  }
})

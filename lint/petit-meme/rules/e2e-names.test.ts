import { testRule } from '../rule-tester.ts'
import { e2eNames } from './e2e-names.ts'

testRule({
  name: 'e2e-names',
  rule: e2eNames,
  tests: {
    valid: [
      {
        code: "page.getByRole('button', { name: m.common_save() })",
        filename: '/repo/e2e/settings.spec.ts'
      },
      {
        code: "page.getByText('Enregistrer')",
        filename: '/repo/src/components/form.tsx'
      }
    ],
    invalid: [
      {
        code: "page.getByRole('button', { name: 'Enregistrer' })",
        filename: '/repo/e2e/settings.spec.ts',
        errors: [{ messageId: 'e2eName' }]
      },
      {
        code: "page.getByText('Enregistrer')",
        filename: '/repo/e2e/settings.spec.ts',
        errors: [{ messageId: 'e2eName' }]
      }
    ]
  }
})

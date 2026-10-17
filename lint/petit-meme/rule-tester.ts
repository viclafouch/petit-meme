import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'

type TestRuleParams = {
  name: string
  rule: Parameters<RuleTester['run']>[1]
  tests: RuleTester.TestCases
}

RuleTester.describe = (text, method) => {
  describe(text, method)
}
RuleTester.it = (text, method) => {
  it(text, method)
}

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: 'tsx' } }
})

export const testRule = ({ name, rule, tests }: TestRuleParams) => {
  ruleTester.run(name, rule, tests)
}

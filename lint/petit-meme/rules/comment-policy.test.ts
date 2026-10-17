import { testRule } from '../rule-tester.ts'
import { commentPolicy } from './comment-policy.ts'

testRule({
  name: 'comment-policy',
  rule: commentPolicy,
  tests: {
    valid: [
      '// oxlint-disable-next-line no-await-in-loop -- the polling is sequential\nawait poll()',
      "/* oxlint-disable no-console */\nconsole.log('done')",
      '// @ts-expect-error the library types are wrong\nlibrary.call()',
      '/// <reference types="vite/client" />'
    ],
    invalid: [
      {
        code: '// read the cookie\nreadCookie()',
        errors: [{ messageId: 'comment' }]
      },
      {
        code: 'const value = 1 /* the default */',
        errors: [{ messageId: 'comment' }]
      },
      {
        code: '// oxlint-disable-next-line no-await-in-loop\nawait poll()',
        errors: [{ messageId: 'missingReason' }]
      },
      {
        code: '/* oxlint-disable no-await-in-loop */\nawait poll()',
        errors: [{ messageId: 'fileLevelDisable' }]
      }
    ]
  }
})

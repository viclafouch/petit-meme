import { defineRule } from '@oxlint/plugins'
import { findEnclosingFunction } from '../helpers.ts'

const SERVER_ENV = 'serverEnv'

export const serverEnvScope = defineRule({
  meta: {
    type: 'problem',
    messages: {
      serverEnv:
        'Read `serverEnv` inside a function: at module scope it throws in the browser.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === SERVER_ENV &&
          findEnclosingFunction(node) === null
        ) {
          context.report({ node, messageId: 'serverEnv' })
        }
      }
    }
  }
})

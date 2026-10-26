import { defineRule, type ESTree } from '@oxlint/plugins'

const RESPONSE = 'Response'

const matchIsResponse = (argument: ESTree.Expression) => {
  if (argument.type === 'NewExpression') {
    return (
      argument.callee.type === 'Identifier' && argument.callee.name === RESPONSE
    )
  }

  return (
    argument.type === 'CallExpression' &&
    argument.callee.type === 'MemberExpression' &&
    argument.callee.object.type === 'Identifier' &&
    argument.callee.object.name === RESPONSE
  )
}

export const noThrowResponse = defineRule({
  meta: {
    type: 'problem',
    messages: {
      throwResponse:
        'Throw an `Error`: a thrown `Response` rejects the call with a `Response`, which carries no message for `getErrorMessage` or `matchIsRateLimitError`.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      ThrowStatement(node) {
        if (matchIsResponse(node.argument)) {
          context.report({ node, messageId: 'throwResponse' })
        }
      }
    }
  }
})

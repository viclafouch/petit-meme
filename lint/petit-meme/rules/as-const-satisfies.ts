import { defineRule } from '@oxlint/plugins'

export const asConstSatisfies = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      asConst: 'Check the constant with `as const satisfies Type`.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      TSAsExpression(node) {
        const assertedType = node.typeAnnotation
        const assertedValue = node.expression

        if (
          assertedType.type === 'TSTypeReference' &&
          assertedType.typeName.type === 'Identifier' &&
          assertedType.typeName.name === 'const' &&
          (assertedValue.type === 'ArrayExpression' ||
            assertedValue.type === 'ObjectExpression') &&
          node.parent.type === 'VariableDeclarator'
        ) {
          context.report({ node, messageId: 'asConst' })
        }
      }
    }
  }
})

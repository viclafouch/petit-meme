import { defineRule } from '@oxlint/plugins'
import { findEnclosingFunction } from '../helpers.ts'

export const destructureInSignature = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      destructure: 'Destructure the params in the function signature.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      VariableDeclarator(node) {
        const initializer = node.init

        if (
          node.id.type !== 'ObjectPattern' ||
          initializer?.type !== 'Identifier'
        ) {
          return
        }

        const enclosingFunction = findEnclosingFunction(node)

        if (
          enclosingFunction === null ||
          node.parent.parent !== enclosingFunction.body
        ) {
          return
        }

        const isParam = enclosingFunction.params.some((param) => {
          return param.type === 'Identifier' && param.name === initializer.name
        })

        if (isParam) {
          context.report({ node, messageId: 'destructure' })
        }
      }
    }
  }
})

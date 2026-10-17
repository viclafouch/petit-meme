import { defineRule } from '@oxlint/plugins'
import {
  getFunctionName,
  matchIsPascalCase,
  type FunctionNode
} from '../helpers.ts'

const BOOLEAN_FUNCTION_NAME = /^match(?:Is|As|Has)[A-Z]/u
const HOOK_PREFIX = 'use'

const matchIsTypeGuard = (node: FunctionNode) => {
  const returnType = node.returnType?.typeAnnotation

  return returnType?.type === 'TSTypePredicate' && !returnType.asserts
}

export const booleanFunctionName = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      booleanFunction:
        'Name a type guard `matchIs*`, `matchAs*` or `matchHas*`.'
    },
    schema: []
  },
  createOnce(context) {
    const checkFunction = (node: FunctionNode) => {
      const name = getFunctionName(node)

      if (
        name === null ||
        matchIsPascalCase(name) ||
        name.startsWith(HOOK_PREFIX) ||
        node.parent.type === 'CallExpression'
      ) {
        return
      }

      if (matchIsTypeGuard(node) && !BOOLEAN_FUNCTION_NAME.test(name)) {
        context.report({ node: node.id ?? node, messageId: 'booleanFunction' })
      }
    }

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction
    }
  }
})

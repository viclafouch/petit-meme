import { defineRule, type ESTree } from '@oxlint/plugins'
import {
  findEnclosingFunction,
  getFunctionName,
  matchIsPascalCase,
  type FunctionNode
} from '../helpers.ts'

const matchIsJsx = (node: ESTree.Node | null) => {
  return node?.type === 'JSXElement' || node?.type === 'JSXFragment'
}

const matchIsNullLiteral = (node: ESTree.Node | null) => {
  return node?.type === 'Literal' && node.value === null
}

const matchIsComponent = (node: FunctionNode) => {
  const name = getFunctionName(node)

  return name !== null && matchIsPascalCase(name)
}

export const childReturnsNull = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      returnNull:
        'Let the parent decide whether to render the component: it renders something every time.'
    },
    schema: []
  },
  createOnce(context) {
    const componentsReturningJsx = new Set<FunctionNode>()
    const nullReturns: ESTree.ReturnStatement[] = []

    return {
      before() {
        componentsReturningJsx.clear()
        nullReturns.length = 0
      },
      ReturnStatement(node) {
        const enclosingFunction = findEnclosingFunction(node)

        if (
          enclosingFunction === null ||
          enclosingFunction.type === 'FunctionExpression' ||
          !matchIsComponent(enclosingFunction)
        ) {
          return
        }

        if (matchIsJsx(node.argument)) {
          componentsReturningJsx.add(enclosingFunction)
        }

        if (matchIsNullLiteral(node.argument)) {
          nullReturns.push(node)
        }
      },
      'Program:exit': () => {
        for (const nullReturn of nullReturns) {
          const enclosingFunction = findEnclosingFunction(nullReturn)

          if (
            enclosingFunction !== null &&
            componentsReturningJsx.has(enclosingFunction) &&
            nullReturn.argument !== null
          ) {
            context.report({
              node: nullReturn.argument,
              messageId: 'returnNull'
            })
          }
        }
      }
    }
  }
})

import { defineRule, type ESTree } from '@oxlint/plugins'
import { matchIsFunctionNode, matchIsUseStateCall } from '../helpers.ts'

type IdentifierNode =
  | ESTree.IdentifierName
  | ESTree.IdentifierReference
  | ESTree.BindingIdentifier
  | ESTree.LabelIdentifier

const matchIsPropertyName = (node: IdentifierNode) => {
  const parentNode = node.parent

  return (
    (parentNode.type === 'MemberExpression' &&
      parentNode.property === node &&
      !parentNode.computed) ||
    (parentNode.type === 'Property' &&
      parentNode.key === node &&
      !parentNode.computed)
  )
}

const findSetterCallUsing = (node: ESTree.Node) => {
  let child = node
  let current = node.parent

  while (current !== null && !matchIsFunctionNode(current)) {
    if (current.type === 'CallExpression' && current.arguments[0] === child) {
      return current
    }

    child = current
    current = current.parent
  }

  return null
}

export const functionalUpdate = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      functional:
        'Derive the next state from the previous one: `{{setter}}((previous) => ...)`.'
    },
    schema: []
  },
  createOnce(context) {
    const stateBySetter = new Map<string, string>()
    const reportedCalls = new Set<ESTree.CallExpression>()

    return {
      before() {
        stateBySetter.clear()
        reportedCalls.clear()
      },
      VariableDeclarator(node) {
        if (
          node.id.type !== 'ArrayPattern' ||
          !matchIsUseStateCall(node.init)
        ) {
          return
        }

        const [state, setter] = node.id.elements

        if (state?.type === 'Identifier' && setter?.type === 'Identifier') {
          stateBySetter.set(setter.name, state.name)
        }
      },
      Identifier(node) {
        const call = findSetterCallUsing(node)

        if (
          call?.callee.type !== 'Identifier' ||
          stateBySetter.get(call.callee.name) !== node.name ||
          reportedCalls.has(call) ||
          matchIsPropertyName(node)
        ) {
          return
        }

        reportedCalls.add(call)
        context.report({
          node: call,
          messageId: 'functional',
          data: { setter: call.callee.name }
        })
      }
    }
  }
})

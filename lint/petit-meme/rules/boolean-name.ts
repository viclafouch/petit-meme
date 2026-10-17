import { defineRule, type ESTree } from '@oxlint/plugins'
import { matchIsUseStateCall } from '../helpers.ts'

const BOOLEAN_NAME = /^(?:is|has|should|can)[A-Z]|^(?:IS|HAS|SHOULD|CAN)_/u
const BOOLEAN_CALLEE = /^(?:matchIs|matchAs|matchHas|Boolean$)/u
const COMPARISON_OPERATORS = new Set<ESTree.BinaryOperator>([
  '===',
  '!==',
  '==',
  '!=',
  '<',
  '>',
  '<=',
  '>=',
  'in',
  'instanceof'
])

const matchIsBooleanExpression = (node: ESTree.Expression | null): boolean => {
  if (node === null) {
    return false
  }

  if (node.type === 'Literal') {
    return typeof node.value === 'boolean'
  }

  if (node.type === 'UnaryExpression') {
    return node.operator === '!'
  }

  if (node.type === 'BinaryExpression') {
    return COMPARISON_OPERATORS.has(node.operator)
  }

  if (node.type === 'LogicalExpression') {
    return (
      node.operator !== '??' &&
      matchIsBooleanExpression(node.left) &&
      matchIsBooleanExpression(node.right)
    )
  }

  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    BOOLEAN_CALLEE.test(node.callee.name)
  )
}

const findBooleanStateName = (node: ESTree.VariableDeclarator) => {
  if (node.id.type !== 'ArrayPattern' || !matchIsUseStateCall(node.init)) {
    return null
  }

  const [state] = node.id.elements
  const [initialState] = node.init.arguments

  if (
    state?.type !== 'Identifier' ||
    initialState?.type !== 'Literal' ||
    typeof initialState.value !== 'boolean'
  ) {
    return null
  }

  return state
}

export const booleanName = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      boolean: 'Name a boolean `is*`, `has*`, `should*` or `can*`.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') {
          if (
            matchIsBooleanExpression(node.init) &&
            !BOOLEAN_NAME.test(node.id.name)
          ) {
            context.report({ node: node.id, messageId: 'boolean' })
          }

          return
        }

        const state = findBooleanStateName(node)

        if (state !== null && !BOOLEAN_NAME.test(state.name)) {
          context.report({ node: state, messageId: 'boolean' })
        }
      }
    }
  }
})

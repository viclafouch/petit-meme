import { defineRule, type ESTree } from '@oxlint/plugins'
import { getCalleeName } from '../helpers.ts'

const CLASS_ATTRIBUTE = /^(?:className|class)$/u
const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cva', 'twMerge'])
const ARBITRARY_VALUE = /\[[^\]]+\]$/u
const DATA_VARIANT_WITHOUT_VALUE = /^data-\[[a-z-]+\]$/u
const HOVER_TRANSFORM = /^-?(?:scale|rotate|translate-y)-/u
const WHITESPACE = /\s+/u

const splitVariants = (token: string) => {
  const parts: string[] = []
  let bracketDepth = 0
  let current = ''

  for (const character of token) {
    if (character === '[') {
      bracketDepth += 1
    }

    if (character === ']') {
      bracketDepth -= 1
    }

    if (character === ':' && bracketDepth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += character
    }
  }

  return [...parts, current]
}

const matchIsClassContext = (node: ESTree.Node) => {
  let current = node.parent

  while (current !== null) {
    if (current.type === 'JSXAttribute') {
      return (
        current.name.type === 'JSXIdentifier' &&
        CLASS_ATTRIBUTE.test(current.name.name)
      )
    }

    if (current.type === 'CallExpression') {
      return CLASS_FUNCTIONS.has(getCalleeName(current.callee) ?? '')
    }

    current = current.parent
  }

  return false
}

export const tailwindClasses = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      arbitraryValue:
        'Move the arbitrary value of `{{token}}` into a utility of `styles.css`.',
      dataShorthand: 'Write the `data-*` shorthand in `{{token}}`.',
      hoverTransform:
        'Keep hover to color changes: `{{token}}` scales, rotates or lifts.'
    },
    schema: []
  },
  createOnce(context) {
    const checkToken = (node: ESTree.Node, token: string) => {
      const parts = splitVariants(token)
      const utility = parts.at(-1) ?? ''
      const variants = parts.slice(0, -1)
      const data = { token }

      if (ARBITRARY_VALUE.test(utility)) {
        context.report({ node, messageId: 'arbitraryValue', data })
      }

      if (
        variants.some((variant) => {
          return DATA_VARIANT_WITHOUT_VALUE.test(variant)
        })
      ) {
        context.report({ node, messageId: 'dataShorthand', data })
      }

      if (variants.includes('hover') && HOVER_TRANSFORM.test(utility)) {
        context.report({ node, messageId: 'hoverTransform', data })
      }
    }

    const checkClassText = (node: ESTree.Node, text: string) => {
      for (const token of text.split(WHITESPACE)) {
        if (token !== '') {
          checkToken(node, token)
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string' && matchIsClassContext(node)) {
          checkClassText(node, node.value)
        }
      },
      TemplateElement(node) {
        if (matchIsClassContext(node)) {
          checkClassText(node, node.value.cooked ?? '')
        }
      }
    }
  }
})

import { defineRule, type ESTree } from '@oxlint/plugins'
import { findJsxAttribute } from '../helpers.ts'

const EXTERNAL_URL = /^https?:/u

const getHrefText = (attribute: ESTree.JSXAttribute | undefined) => {
  const value = attribute?.value

  if (value?.type === 'Literal') {
    return value.value
  }

  if (
    value?.type === 'JSXExpressionContainer' &&
    value.expression.type === 'TemplateLiteral'
  ) {
    return value.expression.quasis[0]?.value.cooked ?? null
  }

  return null
}

export const externalLink = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      external: 'Open an external link in a new tab with `target="_blank"`.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'a') {
          return
        }

        const href = getHrefText(findJsxAttribute(node, 'href'))

        if (
          href !== null &&
          EXTERNAL_URL.test(href) &&
          findJsxAttribute(node, 'target') === undefined
        ) {
          context.report({ node, messageId: 'external' })
        }
      }
    }
  }
})

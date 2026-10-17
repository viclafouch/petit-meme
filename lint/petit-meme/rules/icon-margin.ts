import { defineRule } from '@oxlint/plugins'
import { findJsxAttribute } from '../helpers.ts'

const ICON_PACKAGE = 'lucide-react'
const BUTTON_COMPONENT = 'Button'
const MARGIN_CLASS = /(?:^|\s)-?m[trblxyse]?-/u

export const iconMargin = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      iconMargin: 'Drop the margin: `Button` spaces its icon with `gap`.'
    },
    schema: []
  },
  createOnce(context) {
    const iconNames = new Set<string>()

    return {
      before() {
        iconNames.clear()
      },
      ImportDeclaration(node) {
        if (node.source.value !== ICON_PACKAGE) {
          return
        }

        for (const specifier of node.specifiers) {
          iconNames.add(specifier.local.name)
        }
      },
      JSXElement(node) {
        const { name } = node.openingElement
        const parentElement = node.parent

        if (
          name.type !== 'JSXIdentifier' ||
          !iconNames.has(name.name) ||
          parentElement.type !== 'JSXElement' ||
          parentElement.openingElement.name.type !== 'JSXIdentifier' ||
          parentElement.openingElement.name.name !== BUTTON_COMPONENT
        ) {
          return
        }

        const className = findJsxAttribute(node.openingElement, 'className')

        if (
          className?.value?.type === 'Literal' &&
          MARGIN_CLASS.test(className.value.value)
        ) {
          context.report({ node: className, messageId: 'iconMargin' })
        }
      }
    }
  }
})

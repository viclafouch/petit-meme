import { defineRule } from '@oxlint/plugins'

const BLANK_LINE = /\n[ \t]*\n/u
const BLANK_LINES = /\n(?:[ \t]*\n)+/gu

export const jsxBlankLine = defineRule({
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    messages: { blank: 'Keep sibling JSX elements on consecutive lines.' },
    schema: []
  },
  createOnce(context) {
    return {
      JSXText(node) {
        if (node.value.trim() !== '' || !BLANK_LINE.test(node.value)) {
          return
        }

        context.report({
          node,
          messageId: 'blank',
          fix: (fixer) => {
            return fixer.replaceText(
              node,
              node.value.replaceAll(BLANK_LINES, '\n')
            )
          }
        })
      }
    }
  }
})

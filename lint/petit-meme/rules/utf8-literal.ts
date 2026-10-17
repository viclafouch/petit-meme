import { defineRule, type ESTree } from '@oxlint/plugins'

const INVISIBLE_CHARACTER =
  /[\u00A0\u2000-\u200F\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]/u
const UNICODE_ESCAPE =
  /(?<!\\)(?:\\\\)*\\u(?<codePoint>\{[0-9a-fA-F]+\}|[0-9a-fA-F]{4})/gu
const PRINTABLE_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u
const HEXADECIMAL_RADIX = 16

const matchIsPrintableCodePoint = (codePoint: number) => {
  const character = String.fromCodePoint(codePoint)

  return (
    PRINTABLE_CHARACTER.test(character) && !INVISIBLE_CHARACTER.test(character)
  )
}

const matchHasPrintableEscape = (raw: string) => {
  return [...raw.matchAll(UNICODE_ESCAPE)].some((match) => {
    const hexadecimal = (match.groups?.codePoint ?? '').replaceAll(/[{}]/gu, '')

    return matchIsPrintableCodePoint(
      Number.parseInt(hexadecimal, HEXADECIMAL_RADIX)
    )
  })
}

export const utf8Literal = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      invisible:
        'Put an invisible character in a named constant, written as its escape.',
      escape: 'Write the character in UTF-8, not as a `\\u` escape.'
    },
    schema: []
  },
  createOnce(context) {
    const checkRawText = (node: ESTree.Node, raw: string) => {
      if (INVISIBLE_CHARACTER.test(raw)) {
        context.report({ node, messageId: 'invisible' })

        return
      }

      if (matchHasPrintableEscape(raw)) {
        context.report({ node, messageId: 'escape' })
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          checkRawText(node, context.sourceCode.getText(node))
        }
      },
      TemplateElement(node) {
        checkRawText(node, node.value.raw)
      },
      JSXText(node) {
        if (INVISIBLE_CHARACTER.test(node.value)) {
          context.report({ node, messageId: 'invisible' })
        }
      }
    }
  }
})

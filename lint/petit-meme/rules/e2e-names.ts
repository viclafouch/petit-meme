import { defineRule, type ESTree } from '@oxlint/plugins'
import { getCalleeName } from '../helpers.ts'

const E2E_FOLDER = '/e2e/'
const ROLE_LOCATOR = 'getByRole'
const TEXT_LOCATORS = new Set([
  ROLE_LOCATOR,
  'getByText',
  'getByLabel',
  'getByPlaceholder',
  'getByTitle',
  'getByAltText'
])

const matchIsLiteralText = (node: ESTree.Node | null | undefined) => {
  return (
    (node?.type === 'Literal' && typeof node.value === 'string') ||
    (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
  )
}

const findNameOption = (options: ESTree.Node | undefined) => {
  if (options?.type !== 'ObjectExpression') {
    return null
  }

  const nameProperty = options.properties.find((property) => {
    return (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === 'name'
    )
  })

  return nameProperty?.type === 'Property' ? nameProperty.value : null
}

export const e2eNames = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      e2eName:
        'Name it with `m` from `~/paraglide/messages.js`, not a copy of the string.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const locatorName = getCalleeName(node.callee)

        if (
          !context.filename.includes(E2E_FOLDER) ||
          locatorName === null ||
          !TEXT_LOCATORS.has(locatorName)
        ) {
          return
        }

        const [text, options] = node.arguments

        if (locatorName !== ROLE_LOCATOR && text && matchIsLiteralText(text)) {
          context.report({ node: text, messageId: 'e2eName' })
        }

        const name = findNameOption(options)

        if (name && matchIsLiteralText(name)) {
          context.report({ node: name, messageId: 'e2eName' })
        }
      }
    }
  }
})

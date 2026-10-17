import { defineRule, type ESTree } from '@oxlint/plugins'

const PARAMS_OR_PROPS = /(?:Params|Props)$/u

const findRequiredAfterOptional = (literal: ESTree.TSTypeLiteral) => {
  let hasOptional = false

  for (const member of literal.members) {
    if (member.type === 'TSPropertySignature') {
      if (member.optional) {
        hasOptional = true
      } else if (hasOptional) {
        return member
      }
    }
  }

  return null
}

export const optionalLast = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      optional: 'Put the optional properties after the required ones.'
    },
    schema: []
  },
  createOnce(context) {
    return {
      TSTypeAliasDeclaration(node) {
        if (
          !PARAMS_OR_PROPS.test(node.id.name) ||
          node.typeAnnotation.type !== 'TSTypeLiteral'
        ) {
          return
        }

        const member = findRequiredAfterOptional(node.typeAnnotation)

        if (member !== null) {
          context.report({ node: member, messageId: 'optional' })
        }
      }
    }
  }
})

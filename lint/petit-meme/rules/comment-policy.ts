import { defineRule, type Comment } from '@oxlint/plugins'

const DISABLE_DIRECTIVE = /^\s*oxlint-disable(?<scope>-next-line|-line)?\b/u
const TYPESCRIPT_DIRECTIVE = /^\s*@ts-/u
const TRIPLE_SLASH_REFERENCE = '/ <reference'
const DISABLE_REASON = /\s--\s+\S/u
const FILE_LEVEL_DISABLE_ALLOWED_RULE = 'no-console'

const matchIsToolDirective = (comment: Comment) => {
  return (
    comment.type === 'Shebang' ||
    TYPESCRIPT_DIRECTIVE.test(comment.value) ||
    (comment.type === 'Line' &&
      comment.value.startsWith(TRIPLE_SLASH_REFERENCE))
  )
}

const getDisabledRules = (value: string) => {
  const [rules = ''] = value.replace(/^\s*oxlint-disable/u, '').split('--')

  return rules.trim()
}

export const commentPolicy = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      comment: 'Ship zero comments: name the intent in the code.',
      fileLevelDisable:
        'Disable a rule on one line with `oxlint-disable-next-line`, never for the whole file (only `no-console` may be).',
      missingReason:
        'Give the disable its reason: `// oxlint-disable-next-line rule -- reason`.'
    },
    schema: []
  },
  createOnce(context) {
    const checkComment = (comment: Comment) => {
      if (matchIsToolDirective(comment)) {
        return
      }

      const directive = DISABLE_DIRECTIVE.exec(comment.value)

      if (directive === null) {
        context.report({ node: comment, messageId: 'comment' })

        return
      }

      if (directive.groups?.scope === undefined) {
        if (
          getDisabledRules(comment.value) !== FILE_LEVEL_DISABLE_ALLOWED_RULE
        ) {
          context.report({ node: comment, messageId: 'fileLevelDisable' })
        }

        return
      }

      if (!DISABLE_REASON.test(comment.value)) {
        context.report({ node: comment, messageId: 'missingReason' })
      }
    }

    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          checkComment(comment)
        }
      }
    }
  }
})

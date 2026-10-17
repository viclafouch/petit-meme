import { defineRule, type ESTree } from '@oxlint/plugins'
import { getFileName, matchIsFunctionNode } from '../helpers.ts'

const HOOK_NAME = /^use[A-Z]/u
const HOOK_FILE_PREFIX = 'use-'

const matchIsModuleScope = (node: ESTree.Node) => {
  return node.type === 'Program' || node.type === 'ExportNamedDeclaration'
}

export const hookFileName = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      hookFile: 'Move the hook `{{name}}` to its own `use-*.ts` file.'
    },
    schema: []
  },
  createOnce(context) {
    const checkHook = (identifier: ESTree.BindingIdentifier) => {
      if (
        HOOK_NAME.test(identifier.name) &&
        !getFileName(context.filename).startsWith(HOOK_FILE_PREFIX)
      ) {
        context.report({
          node: identifier,
          messageId: 'hookFile',
          data: { name: identifier.name }
        })
      }
    }

    return {
      VariableDeclarator(node) {
        const declaration = node.parent

        if (
          declaration.type === 'VariableDeclaration' &&
          matchIsModuleScope(declaration.parent) &&
          node.id.type === 'Identifier' &&
          node.init !== null &&
          matchIsFunctionNode(node.init)
        ) {
          checkHook(node.id)
        }
      },
      FunctionDeclaration(node) {
        if (node.id !== null && matchIsModuleScope(node.parent)) {
          checkHook(node.id)
        }
      }
    }
  }
})

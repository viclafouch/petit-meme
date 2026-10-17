import { defineRule } from '@oxlint/plugins'

export const noReExport = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      reExport:
        'Import from the source module: a re-export adds a path without adding anything.'
    },
    schema: []
  },
  createOnce(context) {
    const importedNames = new Set<string>()

    return {
      before() {
        importedNames.clear()
      },
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          importedNames.add(specifier.local.name)
        }
      },
      ExportAllDeclaration(node) {
        context.report({ node, messageId: 'reExport' })
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null) {
          context.report({ node, messageId: 'reExport' })

          return
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.local.type === 'Identifier' &&
            importedNames.has(specifier.local.name)
          ) {
            context.report({ node: specifier, messageId: 'reExport' })
          }
        }
      }
    }
  }
})

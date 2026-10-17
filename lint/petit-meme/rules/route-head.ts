import { defineRule, type ESTree } from '@oxlint/plugins'
import { getCalleeName } from '../helpers.ts'

const SKIPPED_ROUTE_FOLDERS = /\/routes\/(?:admin|api)\//u
const PATHLESS_LAYOUT = /\/_[^/]*$/u

const matchHasProperty = (options: ESTree.ObjectExpression, name: string) => {
  return options.properties.some((property) => {
    return (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === name
    )
  })
}

const matchIsPathlessLayout = (routeCall: ESTree.CallExpression) => {
  const [routePath] = routeCall.arguments

  return (
    routePath?.type === 'Literal' &&
    typeof routePath.value === 'string' &&
    PATHLESS_LAYOUT.test(routePath.value)
  )
}

export const routeHead = defineRule({
  meta: {
    type: 'suggestion',
    messages: { head: 'Give the route a `head()` with `seo()`.' },
    schema: []
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const routeCall = node.callee

        if (
          routeCall.type !== 'CallExpression' ||
          getCalleeName(routeCall.callee) !== 'createFileRoute' ||
          SKIPPED_ROUTE_FOLDERS.test(context.filename) ||
          matchIsPathlessLayout(routeCall)
        ) {
          return
        }

        const [options] = node.arguments

        if (
          options?.type === 'ObjectExpression' &&
          matchHasProperty(options, 'component') &&
          !matchHasProperty(options, 'head')
        ) {
          context.report({ node, messageId: 'head' })
        }
      }
    }
  }
})

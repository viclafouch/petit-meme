import { defineRule, type ESTree } from '@oxlint/plugins'
import { getCalleeName } from '../helpers.ts'

const QUERY_HOOKS = new Set([
  'useQuery',
  'useSuspenseQuery',
  'useInfiniteQuery',
  'useSuspenseInfiniteQuery'
])
const MUTATION_HOOK = 'useMutation'
const QUERY_SUFFIX = 'Query'
const MUTATION_SUFFIX = 'Mutation'

const matchIsQueryDataRead = (init: ESTree.Expression | null) => {
  return (
    init?.type === 'MemberExpression' &&
    init.object.type === 'Identifier' &&
    init.object.name.endsWith(QUERY_SUFFIX) &&
    init.property.type === 'Identifier' &&
    init.property.name === 'data'
  )
}

export const queryNaming = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      destructuredQuery:
        'Keep the query result whole: `const fooQuery = useQuery(...)`, then `fooQuery.data`.',
      queryName: 'Name the query result `*Query`.',
      destructuredMutation:
        'Keep the mutation whole: `const fooMutation = useMutation(...)`.',
      mutationName: 'Name the mutation `*Mutation`.',
      intermediateData:
        'Read `query.data` where it is used, with no intermediate variable.',
      destructuredResult:
        'Keep the query result whole, read `query.data` where it is used.'
    },
    schema: []
  },
  createOnce(context) {
    const checkHookResult = (
      node: ESTree.VariableDeclarator,
      hookName: string | null
    ) => {
      if (hookName !== null && QUERY_HOOKS.has(hookName)) {
        if (node.id.type !== 'Identifier') {
          context.report({ node: node.id, messageId: 'destructuredQuery' })
        } else if (!node.id.name.endsWith(QUERY_SUFFIX)) {
          context.report({ node: node.id, messageId: 'queryName' })
        }

        return true
      }

      if (hookName === MUTATION_HOOK) {
        if (node.id.type !== 'Identifier') {
          context.report({ node: node.id, messageId: 'destructuredMutation' })
        } else if (!node.id.name.endsWith(MUTATION_SUFFIX)) {
          context.report({ node: node.id, messageId: 'mutationName' })
        }

        return true
      }

      return false
    }

    return {
      VariableDeclarator(node) {
        const initializer = node.init

        if (
          initializer?.type === 'CallExpression' &&
          checkHookResult(node, getCalleeName(initializer.callee))
        ) {
          return
        }

        if (matchIsQueryDataRead(initializer)) {
          context.report({ node, messageId: 'intermediateData' })

          return
        }

        if (
          node.id.type === 'ObjectPattern' &&
          initializer?.type === 'Identifier' &&
          initializer.name.endsWith(QUERY_SUFFIX)
        ) {
          context.report({ node, messageId: 'destructuredResult' })
        }
      }
    }
  }
})

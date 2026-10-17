import { defineRule, type ESTree } from '@oxlint/plugins'
import {
  getFunctionName,
  matchIsPascalCase,
  type FunctionNode
} from '../helpers.ts'

const PARAMS_OR_PROPS = /(?:Params|Props)$/u
const SINGLE_REFERENCE = 1

const findObjectPatternAnnotation = (node: FunctionNode) => {
  if (node.params.length !== 1) {
    return null
  }

  const [param] = node.params
  const pattern = param?.type === 'AssignmentPattern' ? param.left : param

  if (pattern?.type !== 'ObjectPattern') {
    return null
  }

  return pattern.typeAnnotation?.typeAnnotation ?? null
}

export const paramsTypeName = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      inline:
        'Name the params object type `*Params` instead of writing it inline.',
      name: 'Name the params object type `*Params`: `{{typeName}}` only types these params.'
    },
    schema: []
  },
  createOnce(context) {
    const localTypeAliases = new Set<string>()
    const referenceCounts = new Map<string, number>()
    const paramsAnnotations: ESTree.TSTypeReference[] = []

    const checkFunction = (node: FunctionNode) => {
      const annotation = findObjectPatternAnnotation(node)
      const name = getFunctionName(node)

      if (annotation === null || name === null || matchIsPascalCase(name)) {
        return
      }

      if (annotation.type === 'TSTypeLiteral') {
        context.report({ node: annotation, messageId: 'inline' })

        return
      }

      if (
        annotation.type === 'TSTypeReference' &&
        annotation.typeName.type === 'Identifier'
      ) {
        paramsAnnotations.push(annotation)
      }
    }

    const reportSingleUseTypes = () => {
      for (const annotation of paramsAnnotations) {
        const typeName =
          annotation.typeName.type === 'Identifier'
            ? annotation.typeName.name
            : ''

        if (
          localTypeAliases.has(typeName) &&
          !PARAMS_OR_PROPS.test(typeName) &&
          referenceCounts.get(typeName) === SINGLE_REFERENCE
        ) {
          context.report({
            node: annotation,
            messageId: 'name',
            data: { typeName }
          })
        }
      }
    }

    return {
      before() {
        localTypeAliases.clear()
        referenceCounts.clear()
        paramsAnnotations.length = 0
      },
      TSTypeAliasDeclaration(node) {
        localTypeAliases.add(node.id.name)
      },
      TSTypeReference(node) {
        if (node.typeName.type === 'Identifier') {
          const { name } = node.typeName

          referenceCounts.set(name, (referenceCounts.get(name) ?? 0) + 1)
        }
      },
      ArrowFunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      'Program:exit': reportSingleUseTypes
    }
  }
})

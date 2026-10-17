import type { ESTree } from '@oxlint/plugins'

export type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function

const PASCAL_CASE = /^[A-Z]/u

export const matchIsFunctionNode = (
  node: ESTree.Node
): node is FunctionNode => {
  return (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration'
  )
}

export const matchIsPascalCase = (name: string) => {
  return PASCAL_CASE.test(name)
}

export const findEnclosingFunction = (node: ESTree.Node) => {
  let current = node.parent

  while (current !== null) {
    if (matchIsFunctionNode(current)) {
      return current
    }

    current = current.parent
  }

  return null
}

const findDeclaratorName = (node: ESTree.Node) => {
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
    return node.id.name
  }

  return null
}

export const getFunctionName = (node: FunctionNode) => {
  if (node.id) {
    return node.id.name
  }

  const parentNode = node.parent

  if (parentNode.type === 'CallExpression') {
    return findDeclaratorName(parentNode.parent)
  }

  return findDeclaratorName(parentNode)
}

export const getCalleeName = (callee: ESTree.Expression) => {
  if (callee.type === 'Identifier') {
    return callee.name
  }

  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name
  }

  return null
}

export const matchIsUseStateCall = (
  node: ESTree.Expression | null
): node is ESTree.CallExpression => {
  return (
    node?.type === 'CallExpression' && getCalleeName(node.callee) === 'useState'
  )
}

export const findJsxAttribute = (
  openingElement: ESTree.JSXOpeningElement,
  name: string
) => {
  return openingElement.attributes.find(
    (attribute): attribute is ESTree.JSXAttribute => {
      return (
        attribute.type === 'JSXAttribute' &&
        attribute.name.type === 'JSXIdentifier' &&
        attribute.name.name === name
      )
    }
  )
}

export const getFileName = (filename: string) => {
  return filename.split('/').at(-1) ?? filename
}

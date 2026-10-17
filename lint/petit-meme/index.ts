import { eslintCompatPlugin } from '@oxlint/plugins'
import { asConstSatisfies } from './rules/as-const-satisfies.ts'
import { booleanFunctionName } from './rules/boolean-function-name.ts'
import { booleanName } from './rules/boolean-name.ts'
import { childReturnsNull } from './rules/child-returns-null.ts'
import { commentPolicy } from './rules/comment-policy.ts'
import { destructureInSignature } from './rules/destructure-in-signature.ts'
import { e2eNames } from './rules/e2e-names.ts'
import { externalLink } from './rules/external-link.ts'
import { functionalUpdate } from './rules/functional-update.ts'
import { hookFileName } from './rules/hook-file-name.ts'
import { iconMargin } from './rules/icon-margin.ts'
import { jsxBlankLine } from './rules/jsx-blank-line.ts'
import { noReExport } from './rules/no-re-export.ts'
import { noThrowResponse } from './rules/no-throw-response.ts'
import { optionalLast } from './rules/optional-last.ts'
import { paramsTypeName } from './rules/params-type-name.ts'
import { queryNaming } from './rules/query-naming.ts'
import { routeHead } from './rules/route-head.ts'
import { serverEnvScope } from './rules/server-env-scope.ts'
import { tailwindClasses } from './rules/tailwind-classes.ts'
import { utf8Literal } from './rules/utf8-literal.ts'

export default eslintCompatPlugin({
  meta: { name: 'petit-meme' },
  rules: {
    'as-const-satisfies': asConstSatisfies,
    'boolean-function-name': booleanFunctionName,
    'boolean-name': booleanName,
    'child-returns-null': childReturnsNull,
    'comment-policy': commentPolicy,
    'destructure-in-signature': destructureInSignature,
    'e2e-names': e2eNames,
    'external-link': externalLink,
    'functional-update': functionalUpdate,
    'hook-file-name': hookFileName,
    'icon-margin': iconMargin,
    'jsx-blank-line': jsxBlankLine,
    'no-re-export': noReExport,
    'no-throw-response': noThrowResponse,
    'optional-last': optionalLast,
    'params-type-name': paramsTypeName,
    'query-naming': queryNaming,
    'route-head': routeHead,
    'server-env-scope': serverEnvScope,
    'tailwind-classes': tailwindClasses,
    'utf8-literal': utf8Literal
  }
})

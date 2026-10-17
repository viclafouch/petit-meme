import { defineConfig } from 'oxlint'
import {
  typescript,
  react,
  hooks,
  jsxA11y,
  imports,
  tanstackQuery,
  vitest,
  playwright
} from '@viclafouch/oxc-config'

const TAKUMI_TAILWIND_PROP = 'tw'

export default defineConfig({
  extends: [typescript, react, hooks, jsxA11y, imports, tanstackQuery],
  jsPlugins: [{ name: 'petit-meme', specifier: './lint/petit-meme/index.ts' }],
  options: {
    typeAware: true
  },
  ignorePatterns: [
    '**/.output/**',
    '**/.vercel/**',
    '**/.nitro/**',
    '**/.tanstack/**',
    '**/db/generated/**',
    '**/components/ui/**',
    '**/components/animate-ui/**',
    'public/ffmpeg/**',
    '**/paraglide/**',
    'src/routeTree.gen.ts'
  ],
  rules: {
    'react/no-children-prop': 'off',
    'petit-meme/comment-policy': 'error',
    'petit-meme/utf8-literal': 'error',
    'petit-meme/jsx-blank-line': 'error',
    'petit-meme/no-re-export': 'error',
    'petit-meme/params-type-name': 'error',
    'petit-meme/optional-last': 'error',
    'petit-meme/destructure-in-signature': 'error',
    'petit-meme/boolean-name': 'error',
    'petit-meme/boolean-function-name': 'error',
    'petit-meme/functional-update': 'error',
    'petit-meme/hook-file-name': 'error',
    'petit-meme/query-naming': 'error',
    'petit-meme/no-throw-response': 'error',
    'petit-meme/server-env-scope': 'error',
    'petit-meme/external-link': 'error',
    'petit-meme/tailwind-classes': 'error',
    'petit-meme/route-head': 'error',
    'petit-meme/as-const-satisfies': 'error',
    'petit-meme/e2e-names': 'error',
    'petit-meme/icon-margin': 'error',
    'petit-meme/child-returns-null': 'error',
    'react/jsx-handler-names': [
      'error',
      { eventHandlerPrefix: 'handle', eventHandlerPropPrefix: 'on' }
    ],
    'no-magic-numbers': [
      'error',
      {
        ignore: [-1, 0, 1, 2],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreClassFieldInitialValues: true,
        ignoreEnums: true,
        ignoreNumericLiteralTypes: true,
        ignoreReadonlyClassProperties: true,
        ignoreTypeIndexes: true,
        enforceConst: true,
        detectObjects: false
      }
    ],
    'react/forbid-elements': [
      'error',
      {
        forbid: [
          { element: 'input', message: 'Use the shadcn `Input`.' },
          { element: 'textarea', message: 'Use the shadcn `Textarea`.' },
          { element: 'select', message: 'Use the shadcn `Select`.' }
        ]
      }
    ],
    'typescript/no-inferrable-types': [
      'error',
      { ignoreParameters: false, ignoreProperties: false }
    ],
    'typescript/strict-boolean-expressions': [
      'error',
      {
        allowAny: false,
        allowNullableBoolean: true,
        allowNullableEnum: false,
        allowNullableNumber: false,
        allowNullableObject: true,
        allowNullableString: true,
        allowNumber: false,
        allowString: false
      }
    ],
    'typescript/only-throw-error': [
      'error',
      {
        allow: [
          {
            from: 'package',
            package: '@tanstack/router-core',
            name: ['Redirect', 'NotFoundError']
          }
        ],
        allowRethrowing: true,
        allowThrowingAny: false,
        allowThrowingUnknown: false
      }
    ]
  },
  overrides: [
    ...vitest.overrides,
    {
      files: ['lint/**/*.test.ts'],
      plugins: ['vitest'],
      rules: {
        'vitest/require-hook': ['error', { allowedFunctionCalls: ['testRule'] }]
      }
    },
    {
      files: ['src/emails/**', 'src/server.ts', 'lint/petit-meme/index.ts'],
      rules: {
        'import/no-default-export': 'off'
      }
    },
    {
      files: ['e2e/**/*.ts'],
      jsPlugins: playwright.jsPlugins,
      rules: {
        ...playwright.rules,
        'playwright/expect-expect': [
          'error',
          { assertFunctionNames: [], assertFunctionPatterns: ['^expect[A-Z]'] }
        ]
      }
    },
    {
      files: ['src/components/og/**'],
      rules: {
        'react/no-unknown-property': [
          'error',
          { ignore: [TAKUMI_TAILWIND_PROP] }
        ]
      }
    }
  ]
})

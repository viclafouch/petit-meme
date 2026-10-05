import { defineConfig } from 'oxlint'
import {
  typescript,
  react,
  hooks,
  jsxA11y,
  imports,
  tanstackQuery,
  vitest
} from '@viclafouch/oxc-config'

const TAKUMI_TAILWIND_PROP = 'tw'

export default defineConfig({
  extends: [typescript, react, hooks, jsxA11y, imports, tanstackQuery],
  jsPlugins: ['eslint-plugin-playwright'],
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
    '.agents/**',
    'src/routeTree.gen.ts'
  ],
  rules: {
    'react/no-children-prop': 'off',
    'react/react-compiler': ['error', { reportAllBailouts: false }],
    'id-length': ['error', { exceptions: ['R', '_', 'm', 'x', 'y', 'T'] }],
    'typescript/prefer-readonly-parameter-types': 'off',
    'typescript/strict-boolean-expressions': 'off',
    'typescript/no-confusing-void-expression': 'off',
    'typescript/no-unsafe-type-assertion': 'off',
    'typescript/only-throw-error': 'off',
    'typescript/no-unsafe-assignment': 'off',
    'typescript/no-unsafe-call': 'off',
    'typescript/no-unsafe-member-access': 'off',
    'typescript/no-unsafe-argument': 'off',
    'typescript/no-unnecessary-boolean-literal-compare': 'off',
    'typescript/use-unknown-in-catch-callback-variable': 'off',
    'typescript/restrict-template-expressions': 'off'
  },
  overrides: [
    {
      files: ['**/*.test.ts'],
      plugins: vitest.plugins,
      rules: vitest.rules
    },
    {
      files: ['src/emails/**', 'src/server.ts', 'playwright.config.ts'],
      rules: {
        'import/no-default-export': 'off'
      }
    },
    {
      files: ['e2e/**/*.ts'],
      rules: {
        'playwright/no-focused-test': 'error',
        'playwright/no-wait-for-timeout': 'error',
        'playwright/no-force-option': 'error',
        'playwright/no-element-handle': 'error',
        'playwright/no-page-pause': 'error',
        'playwright/prefer-web-first-assertions': 'error'
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

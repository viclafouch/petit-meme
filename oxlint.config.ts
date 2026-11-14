import { defineConfig } from 'oxlint'
import {
  typescript,
  react,
  hooks,
  jsxA11y,
  tanstackQuery,
  tanstackStart,
  paraglide,
  vitest,
  imports,
  playwright
} from '@viclafouch/oxc-config'

const TAKUMI_TAILWIND_PROP = 'tw'

const FILES_OUTSIDE_SOURCE_ALIAS = ['e2e/**', 'prisma/**', 'scripts/**']

const FILES_LOADED_BY_VITE_CONFIG = [
  'src/env/server.server.ts',
  'src/env/base.server.ts'
]

const FILES_RUN_IN_TERMINAL = ['scripts/**', 'prisma/seed.ts']

const FILES_RUN_BY_NODE = [
  'scripts/check-env.ts',
  'e2e/fake-anthropic.ts',
  'vite.config.ts',
  'src/constants/env.ts',
  'src/constants/http.ts',
  'src/constants/meme-fill.ts',
  'src/constants/sentry.ts',
  'src/constants/time.ts',
  'src/env/base.server.ts',
  'src/env/client-schema.ts',
  'src/env/server-schema.server.ts',
  'src/env/server.server.ts'
]

export default defineConfig({
  extends: [
    typescript,
    react,
    hooks,
    jsxA11y,
    tanstackQuery,
    tanstackStart,
    paraglide,
    vitest,
    playwright,
    imports
  ],
  jsPlugins: ['./scripts/oxlint/plugin.ts'],
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
    'src/routeTree.gen.ts',
    '.claude/**'
  ],
  rules: {
    'import/no-namespace': [
      'error',
      { ignore: ['@radix-ui/*', '@sentry/tanstackstart-react'] }
    ],
    'viclafouch/app-folders': 'off',
    'viclafouch/env-file': 'off',
    'viclafouch/server-function-file': 'off',
    'petit-meme/no-link-as-button': 'error',
    'react/forbid-elements': [
      'error',
      {
        forbid: [
          { element: 'input', message: 'Use the shadcn `Input`.' },
          { element: 'textarea', message: 'Use the shadcn `Textarea`.' },
          { element: 'select', message: 'Use the shadcn `Select`.' }
        ]
      }
    ]
  },
  overrides: [
    {
      files: [...FILES_OUTSIDE_SOURCE_ALIAS, ...FILES_LOADED_BY_VITE_CONFIG],
      rules: {
        'import/no-relative-parent-imports': 'off'
      }
    },
    {
      files: FILES_RUN_IN_TERMINAL,
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: FILES_RUN_BY_NODE,
      rules: {
        'import/extensions': ['error', 'always', { ignorePackages: true }]
      }
    },
    {
      files: ['src/emails/**', 'scripts/oxlint/plugin.ts'],
      rules: {
        'import/no-default-export': 'off'
      }
    },
    {
      files: ['scripts/oxlint/__tests__/**'],
      plugins: ['vitest'],
      rules: {
        'vitest/require-hook': [
          'error',
          { allowedFunctionCalls: ['ruleTester.run'] }
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

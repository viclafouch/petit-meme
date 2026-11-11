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
  'src/constants/http.ts'
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
    'import/no-namespace': [
      'error',
      { ignore: ['@radix-ui/*', '@sentry/tanstackstart-react'] }
    ],
    'viclafouch/app-folders': 'off',
    'viclafouch/env-file': 'off',
    'viclafouch/server-function-file': 'off',
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
      files: ['src/emails/**'],
      rules: {
        'import/no-default-export': 'off'
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

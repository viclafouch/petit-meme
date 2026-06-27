import { defineConfig } from 'oxlint'
import {
  typescript,
  react,
  hooks,
  jsxA11y,
  imports,
  tanstackQuery
} from '@viclafouch/oxc-config'

export default defineConfig({
  extends: [typescript, react, hooks, jsxA11y, imports, tanstackQuery],
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
    'id-length': ['error', { exceptions: ['R', '_', 'm', 'x', 'y', 'T'] }]
  },
  overrides: [
    {
      // react-email and entry point require default exports
      files: ['src/emails/**', 'src/server.ts'],
      rules: {
        'import/no-default-export': 'off'
      }
    }
  ]
})

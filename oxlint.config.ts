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
      // react-email and entry point require default exports
      files: ['src/emails/**', 'src/server.ts'],
      rules: {
        'import/no-default-export': 'off'
      }
    }
  ]
})

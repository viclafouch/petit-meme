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
      // The vitest preset silences every category, so it cannot go in `extends`
      // without disarming the other presets. Spreading it into an override
      // scoped to test files keeps its rules where they belong.
      files: ['**/*.test.ts'],
      plugins: vitest.plugins,
      rules: vitest.rules
    },
    {
      // react-email and entry point require default exports
      files: ['src/emails/**', 'src/server.ts'],
      rules: {
        'import/no-default-export': 'off'
      }
    },
    {
      // `tw` is Takumi's built-in Tailwind prop, not a DOM attribute. Ignoring
      // it keeps the rule live for genuine typos, which an OG template cannot
      // reveal by inspection.
      files: ['src/components/og/**'],
      rules: {
        'react/no-unknown-property': ['error', { ignore: ['tw'] }]
      }
    }
  ]
})

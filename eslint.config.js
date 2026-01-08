import {
  baseConfig,
  importsConfig,
  prettierConfig,
  reactConfig,
  typescriptConfig
} from '@viclafouch/eslint-config-viclafouch'

/**
 * @type {import("eslint").Linter.Config}
 */
export default [
  ...baseConfig,
  ...reactConfig,
  ...importsConfig,
  ...typescriptConfig,
  ...prettierConfig,
  {
    ignores: [
      '**/node_modules/**',
      '**/.output/**',
      '**/.nitro/**',
      '**/.tanstack/**',
      '**/db/generated/**'
    ]
  },
  {
    rules: {
      '@typescript-eslint/require-await': 'off',
      'require-await': 'off',
      'react/no-children-prop': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      'react/iframe-missing-sandbox': 'off',
      'react/no-array-index-key': 'off',
      'promise/prefer-await-to-then': 'off',
      'no-inline-comments': 'off',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      'id-length': ['error', { exceptions: ['R', '_'] }]
    }
  }
]

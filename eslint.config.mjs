import importsConfig from '@viclafouch/eslint-config-viclafouch/imports.mjs'
import baseConfig from '@viclafouch/eslint-config-viclafouch/index.mjs'
import prettierConfig from '@viclafouch/eslint-config-viclafouch/prettier.mjs'
import reactConfig from '@viclafouch/eslint-config-viclafouch/react.mjs'
import typescriptConfig from '@viclafouch/eslint-config-viclafouch/typescript.mjs'

/**
 * @type {import("eslint").Linter.Config}
 */
export default [
  ...baseConfig,
  ...importsConfig,
  ...reactConfig,
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
      'id-length': ['error', { exceptions: ['R', '_'] }]
    }
  }
]

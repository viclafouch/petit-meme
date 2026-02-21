import {
  hooksConfig,
  importsConfig,
  jsxA11yConfig,
  prettierConfig,
  reactConfig,
  typescriptConfig
} from '@viclafouch/eslint-config-viclafouch'

/**
 * @type {import("eslint").Linter.Config}
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.output/**',
      '**/.nitro/**',
      '**/.tanstack/**',
      '**/db/generated/**',
      '**/components/ui/**',
      '**/components/animate-ui/**'
    ]
  },
  ...typescriptConfig,
  ...reactConfig,
  ...hooksConfig,
  ...jsxA11yConfig,
  ...importsConfig,
  ...prettierConfig,
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
      '@typescript-eslint/no-deprecated': 'off',
      'id-length': ['error', { exceptions: ['R', '_'] }],
      'id-denylist': [
        'error',
        'cb',
        'arr',
        'acc',
        'idx',
        'ctx',
        'res',
        'val',
        'obj',
        'el',
        'elem',
        'req',
        'str'
      ]
    }
  }
]

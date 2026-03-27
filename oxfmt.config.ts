import { defineConfig } from 'oxfmt'
import { oxfmtConfig } from '@viclafouch/oxc-config/formatting'

export default defineConfig({
  ...oxfmtConfig,
  ignorePatterns: [
    'src/routeTree.gen.ts',
    '.agents/**',
    'messages/**',
    '.claude/**',
    '**/*.md'
  ]
})

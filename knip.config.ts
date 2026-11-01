import { defineConfig } from 'knip/config'

export default defineConfig({
  entry: [
    'vite.config.ts',
    'playwright.config.ts',
    'prisma.config.ts',
    'prisma/seed.ts',
    'project.inlang/paraglide.config.ts',
    'scripts/*.ts',
    'e2e/*.setup.ts',
    'e2e/fake-anthropic.ts'
  ],
  vite: { config: [] },
  playwright: { config: [] },
  prisma: { config: [] },
  ignore: ['src/db/generated/**'],
  ignoreIssues: {
    'src/components/ui/**': ['exports', 'types'],
    'src/components/animate-ui/**': ['exports', 'types']
  },
  ignoreBinaries: ['run'],
  ignoreDependencies: [
    '@ffmpeg/core',
    '@dicebear/styles',
    'pino-pretty',
    '@tanstack/intent'
  ],
  rules: {
    cycles: 'error'
  },
  treatConfigHintsAsErrors: true,
  treatTagHintsAsErrors: true
})

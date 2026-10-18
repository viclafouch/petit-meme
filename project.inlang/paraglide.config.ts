import { defineConfig } from '@inlang/paraglide-js'

export default defineConfig({
  outdir: './src/paraglide',
  outputStructure: 'message-modules',
  cookieName: 'PARAGLIDE_LOCALE',
  strategy: ['cookie', 'url', 'preferredLanguage', 'baseLocale'],
  urlPatterns: [
    {
      pattern: '/:path(.*)?',
      localized: [['en', '/en/:path(.*)?']]
    }
  ],
  routeStrategies: [
    { match: '/api/:path(.*)?', exclude: true },
    { match: '/admin/:path(.*)?', exclude: true },
    { match: '/health', exclude: true },
    { match: '/sitemap:rest(.*)', exclude: true },
    { match: '/robots.txt', exclude: true }
  ]
})

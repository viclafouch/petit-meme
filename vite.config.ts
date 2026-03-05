import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'

const ONE_YEAR_IN_SECONDS = 31_536_000

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

const IMMUTABLE_ASSET_HEADERS = {
  ...SECURITY_HEADERS,
  'Cache-Control': `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`
}

const STATIC_ASSET_ROUTES = [
  '/images/**',
  '/videos/**',
  '/fonts/**',
  '/ffmpeg/**'
]

const staticAssetRouteRules = Object.fromEntries(
  STATIC_ASSET_ROUTES.map((route) => {
    return [route, { headers: IMMUTABLE_ASSET_HEADERS }]
  })
)

export default defineConfig({
  server: {
    port: 3000
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core', '@ffmpeg/util', 'hls.js']
  },
  assetsInclude: ['**/*.md'],
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'PARAGLIDE_LOCALE',
      strategy: ['url', 'cookie', 'baseLocale'],
      urlPatterns: [
        {
          pattern: '/',
          localized: [
            ['fr', '/'],
            ['en', '/en']
          ]
        },
        {
          pattern: '/memes',
          localized: [
            ['fr', '/memes'],
            ['en', '/en/memes']
          ]
        },
        {
          pattern: '/memes/:memeId',
          localized: [
            ['fr', '/memes/:memeId'],
            ['en', '/en/memes/:memeId']
          ]
        },
        {
          pattern: '/memes/category/:slug',
          localized: [
            ['fr', '/memes/category/:slug'],
            ['en', '/en/memes/category/:slug']
          ]
        },
        {
          pattern: '/memes/:memeId/studio',
          localized: [
            ['fr', '/memes/:memeId/studio'],
            ['en', '/en/memes/:memeId/studio']
          ]
        },
        {
          pattern: '/random',
          localized: [
            ['fr', '/random'],
            ['en', '/en/random']
          ]
        },
        {
          pattern: '/favorites',
          localized: [
            ['fr', '/favorites'],
            ['en', '/en/favorites']
          ]
        },
        {
          pattern: '/pricing',
          localized: [
            ['fr', '/pricing'],
            ['en', '/en/pricing']
          ]
        },
        {
          pattern: '/settings',
          localized: [
            ['fr', '/settings'],
            ['en', '/en/settings']
          ]
        },
        {
          pattern: '/checkout/success',
          localized: [
            ['fr', '/checkout/success'],
            ['en', '/en/checkout/success']
          ]
        },
        {
          pattern: '/password/reset',
          localized: [
            ['fr', '/password/reset'],
            ['en', '/en/password/reset']
          ]
        },
        {
          pattern: '/password/create-new',
          localized: [
            ['fr', '/password/create-new'],
            ['en', '/en/password/create-new']
          ]
        },
        {
          pattern: '/terms-of-use',
          localized: [
            ['fr', '/terms-of-use'],
            ['en', '/en/terms-of-use']
          ]
        },
        {
          pattern: '/privacy',
          localized: [
            ['fr', '/privacy'],
            ['en', '/en/privacy']
          ]
        },
        {
          pattern: '/mentions-legales',
          localized: [
            ['fr', '/mentions-legales'],
            ['en', '/en/mentions-legales']
          ]
        },
        {
          pattern: '/reels',
          localized: [
            ['fr', '/reels'],
            ['en', '/en/reels']
          ]
        }
      ]
    }),
    tailwindcss(),
    tsconfigPaths({
      projects: ['./tsconfig.json']
    }),
    tanstackStart({
      router: {
        quoteStyle: 'single',
        semicolons: false
      }
    }),
    react(),
    nitro({
      preset: 'vercel',
      routeRules: {
        '/**': {
          headers: {
            ...SECURITY_HEADERS,
            'Cache-Control': 'no-cache'
          }
        },
        ...staticAssetRouteRules,
        '/admin/**': {
          headers: {
            ...SECURITY_HEADERS,
            'X-Robots-Tag': 'noindex, nofollow'
          }
        }
      }
    }),
    sentryTanstackStart({
      org: 'viclafouch',
      project: 'petit-meme',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.VERCEL_GIT_COMMIT_SHA
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ['.vercel/output/**/*.map']
      }
    })
  ]
})

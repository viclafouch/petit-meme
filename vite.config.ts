import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'
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

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_* vars to import.meta.env (client-safe).
  // Server-side code (Nitro, Sentry plugin, etc.) reads from process.env,
  // which Vite does NOT populate from .env files by default.
  // loadEnv with an empty prefix ('') loads ALL vars from .env.{mode},
  // and Object.assign merges them into process.env so server code can access them.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    resolve: {
      tsconfigPaths: true
    },
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
      }),
      tailwindcss(),
      tanstackStart({
        router: {
          quoteStyle: 'single',
          semicolons: false
        }
      }),
      react(),
      nitro({
        preset: 'vercel',
        sourcemap: true,
        vercel: {
          functions: {
            runtime: 'nodejs24.x'
          }
        },
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
  }
})

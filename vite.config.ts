import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import {
  IMMUTABLE_CACHE_CONTROL,
  WEEKLY_CACHE_CONTROL
} from './src/constants/http.ts'
import { MEME_FILL_MAX_DURATION_SECONDS } from './src/constants/meme-fill.ts'
import {
  SENTRY_APPLICATION_KEY,
  SENTRY_ORG,
  SENTRY_PROJECT
} from './src/constants/sentry.ts'

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

const IMMUTABLE_ASSET_HEADERS = {
  ...SECURITY_HEADERS,
  'Cache-Control': IMMUTABLE_CACHE_CONTROL
}

const AVATAR_ASSET_HEADERS = {
  ...SECURITY_HEADERS,
  'Cache-Control': WEEKLY_CACHE_CONTROL
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

const NODE_RUNTIME_PACKAGES = ['takumi-js', '@takumi-rs/core']

const PACKAGES_SHARING_PG_INSTANCE = ['@prisma/adapter-pg']

const WITHOUT_PREFIX_FILTER = ''

const SERVER_ONLY_PACKAGES = [
  '@algolia/client-search',
  '@algolia/recommend',
  '@better-auth/prisma-adapter',
  '@better-auth/stripe',
  '@google/genai',
  '@prisma/adapter-pg',
  '@prisma/client',
  '@tanstack/ai',
  '@tanstack/ai-anthropic',
  '@tanstack/ai-gemini',
  '@tanstack/ai-gemini/tools',
  '@vercel/blob',
  '@vercel/functions',
  'better-auth',
  'better-auth/adapters/memory',
  'better-auth/api',
  'better-auth/crypto',
  'better-auth/plugins',
  'better-auth/tanstack-start',
  'pg',
  'react-email',
  'react-tweet/api',
  'resend',
  'stripe',
  'takumi-js',
  /^node:/u
]

const BROWSER_ONLY_PACKAGES = ['@ffmpeg/ffmpeg', 'hls.js']

export default defineConfig(async ({ mode }) => {
  // oxlint-disable-next-line node/no-process-env -- the Vite config is the build boundary that loads the mode's env files into the process environment
  const processEnvironment = process.env

  Object.assign(
    processEnvironment,
    loadEnv(mode, process.cwd(), WITHOUT_PREFIX_FILTER)
  )

  processEnvironment.VITE_VERCEL_ENV ??=
    processEnvironment.VERCEL_ENV ?? 'development'

  const { serverEnv } = await import('./src/env/server.server.ts')

  return {
    resolve: {
      tsconfigPaths: true
    },
    server: {
      port: 3000,
      strictPort: true
    },
    ssr: {
      external: NODE_RUNTIME_PACKAGES,
      noExternal: PACKAGES_SHARING_PG_INSTANCE
    },
    optimizeDeps: {
      exclude: [
        '@ffmpeg/ffmpeg',
        '@ffmpeg/core',
        '@ffmpeg/util',
        'hls.js',
        'takumi-js',
        '@takumi-rs/core'
      ]
    },
    assetsInclude: ['**/*.md'],
    plugins: [
      tailwindcss(),
      tanstackStart({
        importProtection: {
          client: {
            specifiers: SERVER_ONLY_PACKAGES
          },
          server: {
            specifiers: BROWSER_ONLY_PACKAGES
          }
        },
        router: {
          quoteStyle: 'single',
          semicolons: false
        }
      }),
      react({ compiler: true }),
      paraglideVitePlugin({
        project: './project.inlang'
      }),
      nitro({
        preset: mode === 'e2e' ? 'node-server' : 'vercel',
        sourcemap: true,
        exportConditions: ['!unwasm'],
        traceDeps: NODE_RUNTIME_PACKAGES,
        rolldownConfig: {
          onLog: (level, log, handler) => {
            if (log.code !== 'MODULE_LEVEL_DIRECTIVE') {
              handler(level, log)
            }
          }
        },
        vercel: {
          functionRules: {
            '/api/bunny': { maxDuration: MEME_FILL_MAX_DURATION_SECONDS }
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
          '/avatars/**': {
            headers: AVATAR_ASSET_HEADERS
          },
          '/api/og': {
            headers: IMMUTABLE_ASSET_HEADERS
          },
          '/admin/**': {
            headers: {
              ...SECURITY_HEADERS,
              'X-Robots-Tag': 'noindex, nofollow'
            }
          }
        }
      }),
      sentryTanstackStart({
        org: SENTRY_ORG,
        project: SENTRY_PROJECT,
        applicationKey: SENTRY_APPLICATION_KEY,
        authToken: serverEnv.SENTRY_AUTH_TOKEN,
        release: {
          name: serverEnv.VERCEL_GIT_COMMIT_SHA
        },
        sourcemaps: {
          filesToDeleteAfterUpload: ['.vercel/output/**/*.map']
        },
        bundleSizeOptimizations: {
          excludeChannelInjection: true
        },
        tunnelRoute: true,
        autoInstrumentMiddleware: false
      })
    ]
  }
})

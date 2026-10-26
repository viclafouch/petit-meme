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
import { SENTRY_APPLICATION_KEY } from './src/constants/sentry.ts'

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

const WITHOUT_PREFIX_FILTER = ''

export default defineConfig(async ({ mode }) => {
  // oxlint-disable-next-line node/no-process-env -- the Vite config is the build boundary that loads the mode's env files into the process environment
  const processEnvironment = process.env

  Object.assign(
    processEnvironment,
    loadEnv(mode, process.cwd(), WITHOUT_PREFIX_FILTER)
  )

  processEnvironment.VITE_VERCEL_ENV ??=
    processEnvironment.VERCEL_ENV ?? 'development'

  const [{ serverEnv }] = await Promise.all([
    import('./src/env/server.ts'),
    import('./src/env/client.ts')
  ])

  return {
    resolve: {
      tsconfigPaths: true
    },
    server: {
      port: 3000
    },
    ssr: {
      external: ['takumi-js', '@takumi-rs/core']
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
        traceDeps: ['takumi-js', '@takumi-rs/core'],
        rolldownConfig: {
          onLog: (level, log, handler) => {
            if (log.code !== 'MODULE_LEVEL_DIRECTIVE') {
              handler(level, log)
            }
          }
        },
        vercel: {},
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
        org: 'viclafouch',
        project: 'petit-meme',
        applicationKey: SENTRY_APPLICATION_KEY,
        authToken: processEnvironment.SENTRY_AUTH_TOKEN,
        release: {
          name: serverEnv.VERCEL_GIT_COMMIT_SHA
        },
        sourcemaps: {
          filesToDeleteAfterUpload: ['.vercel/output/**/*.map']
        },
        tunnelRoute: true
      })
    ]
  }
})

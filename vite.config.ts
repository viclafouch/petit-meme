import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { sentryTanstackStart } from '@sentry/tanstackstart-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

const IMMUTABLE_CACHE = {
  'Cache-Control': 'public, max-age=31536000, immutable'
}

export default defineConfig({
  server: {
    port: 3000
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'hls.js']
  },
  assetsInclude: ['**/*.md'],
  plugins: [
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
      preset: 'node-server',
      routeRules: {
        '/**': { headers: SECURITY_HEADERS },
        '/images/**': {
          headers: { ...SECURITY_HEADERS, ...IMMUTABLE_CACHE }
        },
        '/videos/**': {
          headers: { ...SECURITY_HEADERS, ...IMMUTABLE_CACHE }
        },
        '/fonts/**': {
          headers: { ...SECURITY_HEADERS, ...IMMUTABLE_CACHE }
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
      authToken: process.env.SENTRY_AUTH_TOKEN
    })
  ]
})

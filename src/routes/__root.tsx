/// <reference types="vite/client" />
import React from 'react'
import { OnlyPortrait } from '@/components/only-portrait'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { Toaster } from '@/components/ui/sonner'
import { getAuthUserQueryOpts } from '@/lib/queries'
import { getStoredTheme, ThemeProvider } from '@/lib/theme'
import type { getAuthUser } from '@/server/user-auth'
import { DialogProvider } from '@/stores/dialog.store'
import type { QueryClient } from '@tanstack/react-query'
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts
} from '@tanstack/react-router'
import appCss from '../styles.css?url'

const TanStackQueryDevtools =
  process.env.NODE_ENV === 'production'
    ? () => {
        return null
      }
    : React.lazy(async () => {
        const result = await import(
          '@tanstack/react-query-devtools/build/modern/production.js'
        )

        return { default: result.ReactQueryDevtools }
      })

const TanStackRouterDevtools =
  process.env.NODE_ENV === 'production'
    ? () => {
        return null
      }
    : React.lazy(async () => {
        const result = await import('@tanstack/react-router-devtools')

        return { default: result.TanStackRouterDevtools }
      })

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  const { _storedTheme } = Route.useLoaderData()

  return (
    <html lang="fr" suppressHydrationWarning dir="ltr">
      <head>
        <meta name="algolia-site-verification" content="57C07DF31C29F6D0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap"
          rel="stylesheet"
        />
        <HeadContent />
      </head>
      <body>
        {/* <ScriptOnce>
          {`window.$ujq=window.$ujq||[];window.uj=window.uj||new Proxy({},{get:(_,p)=>(...a)=>window.$ujq.push([p,...a])});document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.userjot.com/sdk/v2/uj.js',type:'module',async:!0}));`}
        </ScriptOnce> */}
        <ScriptOnce>
          {`(function() {
          const storedTheme = ${JSON.stringify(_storedTheme)};
          if (storedTheme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.className = systemTheme;
          } else {
            document.documentElement.className = storedTheme;
          }
        })();`}
        </ScriptOnce>
        <ThemeProvider initialTheme={_storedTheme}>
          <OnlyPortrait>
            <DialogProvider>{children}</DialogProvider>
          </OnlyPortrait>
          <ClientOnly>
            <Toaster richColors />
          </ClientOnly>
          <React.Suspense>
            <TanStackRouterDevtools position="bottom-left" />
            <TanStackQueryDevtools buttonPosition="bottom-right" />
          </React.Suspense>
          <TailwindIndicator />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

const RootComponent = () => {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  user: Awaited<ReturnType<typeof getAuthUser>>
}>()({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.fetchQuery(getAuthUserQueryOpts())

    return { user }
  },
  loader: async () => {
    return {
      _storedTheme: await getStoredTheme()
    }
  },
  head: () => {
    return {
      meta: [
        { charSet: 'utf-8' },
        {
          name: 'theme-color',
          content: '#ffffff',
          media: '(prefers-color-scheme: light)'
        },
        {
          name: 'theme-color',
          content: '#000000',
          media: '(prefers-color-scheme: dark)'
        },
        {
          name: 'color-scheme',
          content: 'dark light'
        },
        {
          name: 'robots',
          content: 'index,follow,noai,noimageai'
        },
        {
          httpEquiv: 'Content-Language',
          content: 'fr'
        },
        {
          httpEquiv: 'X-Robots-Tag',
          content: 'noai,noimageai'
        },
        {
          name: 'mobile-web-app-capable',
          content: 'yes'
        },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        {
          rel: 'icon',
          href: '/favicon-32x32.png',
          sizes: '32x32',
          type: 'image/png'
        },
        {
          rel: 'icon',
          href: '/favicon-16x16.png',
          sizes: '16x16',
          type: 'image/png'
        },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        {
          rel: 'icon',
          href: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          rel: 'icon',
          href: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        { rel: 'manifest', href: '/manifest.json' }
      ]
    }
  },
  component: RootComponent
})

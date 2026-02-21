/// <reference types="vite/client" />
import React from 'react'
import { CookieConsentBanner } from '@/components/blocks/cookie-consent'
import { OnlyPortrait } from '@/components/only-portrait'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { Toaster } from '@/components/ui/sonner'
import { clientEnv } from '@/env/client'
import { getCookieConsent } from '@/lib/cookie-consent'
import { getAuthUserQueryOpts } from '@/lib/queries'
import { getStoredTheme, ThemeProvider } from '@/lib/theme'
import type { getAuthUser } from '@/server/user-auth'
import { DialogProvider } from '@/stores/dialog.store'
import { ensureAlgoliaUserToken } from '@/utils/tracking-cookies'
import type { QueryClient } from '@tanstack/react-query'
import type { ErrorComponentProps } from '@tanstack/react-router'
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
        const result =
          await import('@tanstack/react-query-devtools/build/modern/production.js')

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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { _storedTheme, _cookieConsent } = Route.useLoaderData()

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
          rel="preconnect"
          href={`https://${clientEnv.VITE_BUNNY_HOSTNAME}`}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap"
          rel="stylesheet"
        />
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>
          {`document.documentElement.className = ${JSON.stringify(_storedTheme)};`}
        </ScriptOnce>
        <ThemeProvider initialTheme={_storedTheme}>
          <OnlyPortrait>
            <DialogProvider>{children}</DialogProvider>
          </OnlyPortrait>
          <ClientOnly>
            <Toaster richColors />
          </ClientOnly>
          <CookieConsentBanner initialConsent={_cookieConsent} />
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

const RootErrorDocument = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="fr" dir="ltr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

const RootErrorComponent = ({ error, reset }: ErrorComponentProps) => {
  return (
    <RootErrorDocument>
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily:
            'Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif',
          backgroundColor: 'hsl(0 0% 3.9%)',
          color: 'hsl(0 0% 98%)'
        }}
      >
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 700,
              letterSpacing: '-0.05em',
              marginBottom: '0.5rem'
            }}
          >
            500
          </h1>
          <p
            style={{
              color: 'hsl(0 0% 63.9%)',
              marginBottom: '2rem'
            }}
          >
            Oups ! Le site a rencontré un problème inattendu.
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: 'hsl(0 0% 98%)',
                color: 'hsl(0 0% 3.9%)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid hsl(0 0% 14.9%)',
                backgroundColor: 'transparent',
                color: 'hsl(0 0% 98%)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              Retourner au site
            </a>
          </div>
          {process.env.NODE_ENV !== 'production' ? (
            <pre
              style={{
                marginTop: '2rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'hsl(0 0% 9%)',
                color: 'hsl(0 62.8% 70.6%)',
                fontSize: '0.75rem',
                textAlign: 'left',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          ) : null}
        </div>
      </div>
    </RootErrorDocument>
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
    const cookieConsent = getCookieConsent()

    if (cookieConsent === 'accepted') {
      ensureAlgoliaUserToken()
    }

    return {
      _storedTheme: getStoredTheme(),
      _cookieConsent: cookieConsent
    }
  },
  head: () => {
    return {
      meta: [
        { charSet: 'utf-8' },
        {
          name: 'theme-color',
          content: '#000000'
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
        { name: 'apple-mobile-web-app-title', content: 'Petit Meme' },
        { name: 'application-name', content: 'Petit Meme' },
        { name: 'format-detection', content: 'telephone=no' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        }
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
  component: RootComponent,
  errorComponent: RootErrorComponent
})

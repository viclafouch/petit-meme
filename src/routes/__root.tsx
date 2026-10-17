/// <reference types="vite/client" />
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'
import { matchIsAnalyticsConsented } from '~/components/cookie-consent/utils'
import { getConsentState } from '~/lib/cookie-consent'
import { getAuthUserQueryOpts } from '~/lib/queries'
import { getStoredTheme } from '~/lib/theme'
import { getLocale } from '~/paraglide/runtime'
import type { getAuthUser } from '~/server/user-auth'
import { ensureAlgoliaUserToken } from '~/utils/tracking-cookies'
import appCss from '../styles.css?url'
import { RootComponent } from './-components/root-component'
import { RootErrorComponent } from './-components/root-error-component'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  user: Awaited<ReturnType<typeof getAuthUser>>
}>()({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.query(getAuthUserQueryOpts())

    return { user }
  },
  loader: async () => {
    const consentState = getConsentState()

    if (matchIsAnalyticsConsented(consentState)) {
      ensureAlgoliaUserToken()
    }

    return {
      _storedTheme: getStoredTheme(),
      _consentState: consentState
    }
  },
  head: () => {
    return {
      meta: [
        { charSet: 'utf8' },
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
          content:
            'index,follow,max-video-preview:-1,max-image-preview:large,noai,noimageai'
        },
        {
          httpEquiv: 'Content-Language',
          content: getLocale()
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
        {
          rel: 'manifest',
          href: '/manifest.json',
          crossOrigin: 'use-credentials'
        }
      ]
    }
  },
  component: RootComponent,
  errorComponent: RootErrorComponent
})

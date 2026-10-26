import type React from 'react'
import { MotionConfig } from 'motion/react'
import {
  ClientOnly,
  getRouteApi,
  HeadContent,
  ScriptOnce,
  Scripts
} from '@tanstack/react-router'
import { CookieBanner } from '~/components/cookie-consent/cookie-banner'
import { CookieConsentProvider } from '~/components/cookie-consent/cookie-provider'
import { CookieSettings } from '~/components/cookie-consent/cookie-settings'
import { DialogProvider } from '~/components/dialog-provider'
import { TailwindIndicator } from '~/components/tailwind-indicator'
import { ThemeProvider } from '~/components/theme-provider'
import { Toaster } from '~/components/ui/sonner'
import { IS_PRODUCTION } from '~/constants/env'
import { clientEnv } from '~/env/client'
import { getCookieConsentConfig } from '~/lib/cookie-consent'
import { getLocale, getTextDirection } from '~/paraglide/runtime'

const rootRouteApi = getRouteApi('__root__')

type RootDocumentProps = {
  children: React.ReactNode
}

export const RootDocument = ({ children }: RootDocumentProps) => {
  const { _storedTheme, _consentState } = rootRouteApi.useLoaderData()
  const cookieConsentConfig = getCookieConsentConfig()

  return (
    <html lang={getLocale()} suppressHydrationWarning dir={getTextDirection()}>
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
        <MotionConfig reducedMotion="user">
          <ThemeProvider initialTheme={_storedTheme}>
            <CookieConsentProvider
              config={cookieConsentConfig}
              initialState={_consentState}
            >
              <DialogProvider>{children}</DialogProvider>
              <ClientOnly>
                <Toaster richColors />
              </ClientOnly>
              <ClientOnly>
                <CookieBanner />
              </ClientOnly>
              <CookieSettings />
              {IS_PRODUCTION ? null : <TailwindIndicator />}
            </CookieConsentProvider>
          </ThemeProvider>
        </MotionConfig>
        <Scripts />
      </body>
    </html>
  )
}

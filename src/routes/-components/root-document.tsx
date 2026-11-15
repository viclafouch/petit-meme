import type React from 'react'
import { MotionConfig } from 'motion/react'
import {
  ClientOnly,
  getRouteApi,
  HeadContent,
  ScriptOnce,
  Scripts,
  useMatch
} from '@tanstack/react-router'
import { DialogOutlet, DialogProvider } from '~/components/app/dialog-provider'
import { TailwindIndicator } from '~/components/app/tailwind-indicator'
import { ThemeProvider } from '~/components/app/theme-provider'
import { CookieBanner } from '~/components/cookie-consent/cookie-banner'
import { CookieConsentProvider } from '~/components/cookie-consent/cookie-provider'
import { CookieSettings } from '~/components/cookie-consent/cookie-settings'
import { StudioProvider } from '~/components/studio/studio-provider'
import { Toaster } from '~/components/ui/sonner'
import { IS_PRODUCTION } from '~/constants/env'
import { clientEnv } from '~/env/client'
import { m } from '~/paraglide/messages'
import { getLocale, getTextDirection } from '~/paraglide/runtime'
import { WebAnalytics } from './web-analytics'

const rootRouteApi = getRouteApi('__root__')

type RootDocumentProps = {
  children: React.ReactNode
}

export const RootDocument = ({ children }: RootDocumentProps) => {
  const { _storedTheme, _consentState } = rootRouteApi.useLoaderData()
  const embedMatch = useMatch({ from: '/embed/$memeId', shouldThrow: false })
  const adminMatch = useMatch({ from: '/admin', shouldThrow: false })
  const documentTheme = adminMatch ? 'dark' : _storedTheme

  return (
    <html lang={getLocale()} suppressHydrationWarning dir={getTextDirection()}>
      <head>
        <meta name="algolia-site-verification" content="57C07DF31C29F6D0" />
        <link
          rel="preconnect"
          href={`https://${clientEnv.VITE_BUNNY_HOSTNAME}`}
        />
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>
          {`document.documentElement.className = ${JSON.stringify(documentTheme)};`}
        </ScriptOnce>
        <MotionConfig reducedMotion="user">
          <ThemeProvider initialTheme={_storedTheme}>
            <CookieConsentProvider storedConsent={_consentState}>
              <DialogProvider>
                <StudioProvider>{children}</StudioProvider>
                <DialogOutlet />
                <ClientOnly>
                  <Toaster
                    richColors
                    closeButton
                    toastOptions={{ closeButtonAriaLabel: m.common_close() }}
                    offset={{ bottom: 'var(--toast-offset-bottom)' }}
                    mobileOffset={{ bottom: 'var(--toast-offset-bottom)' }}
                  />
                </ClientOnly>
                {embedMatch ? null : (
                  <ClientOnly>
                    <CookieBanner />
                  </ClientOnly>
                )}
                <CookieSettings />
                {IS_PRODUCTION ? null : <TailwindIndicator />}
                {clientEnv.VITE_VERCEL_ENV === 'production' ? (
                  <WebAnalytics />
                ) : null}
              </DialogProvider>
            </CookieConsentProvider>
          </ThemeProvider>
        </MotionConfig>
        <Scripts />
      </body>
    </html>
  )
}

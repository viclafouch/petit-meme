import React from 'react'
import type { CookieConsentContextValue } from './types'

export const CookieConsentContext =
  React.createContext<CookieConsentContextValue | null>(null)

export function useCookieConsent() {
  const context = React.useContext(CookieConsentContext)

  if (!context) {
    throw new Error(
      'useCookieConsent must be used within a CookieConsentProvider'
    )
  }

  return context
}

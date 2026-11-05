import type React from 'react'
import { useCreateStore } from '@tanstack/react-store'
import {
  CookieConsentStoreProvider,
  createCookieConsentActions,
  getInitialCookieConsentState
} from './cookie-consent.store'
import type { ConsentState } from './types'

type CookieConsentProviderProps = {
  children: React.ReactNode
  storedConsent: ConsentState | null
}

export const CookieConsentProvider = ({
  children,
  storedConsent
}: CookieConsentProviderProps) => {
  const cookieConsentStore = useCreateStore(
    getInitialCookieConsentState(storedConsent),
    createCookieConsentActions
  )

  return (
    <CookieConsentStoreProvider value={cookieConsentStore}>
      {children}
    </CookieConsentStoreProvider>
  )
}

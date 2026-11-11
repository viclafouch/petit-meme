import type React from 'react'
import { useCreateStore } from '@tanstack/react-store'
import type { ConsentState } from '~/helpers/cookie-consent'
import {
  CookieConsentStoreProvider,
  createCookieConsentActions,
  getInitialCookieConsentState
} from '~/stores/cookie-consent.store'

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

import { createStoreContext, type Store } from '@tanstack/react-store'
import { CONSENT_VERSION } from '~/constants/cookie'
import {
  type ConsentCategories,
  type ConsentState,
  getAllAcceptedCategories,
  getDefaultCategories
} from '~/helpers/cookie-consent'
import { saveConsentState } from '~/lib/cookie-consent'

type CookieConsentState = {
  consent: ConsentState
  isBannerVisible: boolean
  isSettingsOpen: boolean
}

export const createCookieConsentActions = ({
  setState
}: Pick<Store<CookieConsentState>, 'setState'>) => {
  const saveConsent = (categories: ConsentCategories) => {
    const consent = {
      hasConsented: true,
      categories: { ...categories, necessary: true },
      lastUpdated: new Date().toISOString(),
      consentVersion: CONSENT_VERSION
    } satisfies ConsentState

    saveConsentState(consent)
    setState(() => {
      return { consent, isBannerVisible: false, isSettingsOpen: false }
    })
  }

  return {
    acceptAll: () => {
      saveConsent(getAllAcceptedCategories())
    },
    rejectAll: () => {
      saveConsent(getDefaultCategories())
    },
    updateConsent: saveConsent,
    openSettings: () => {
      setState((prev) => {
        return { ...prev, isSettingsOpen: true }
      })
    },
    closeSettings: () => {
      setState((prev) => {
        return { ...prev, isSettingsOpen: false }
      })
    }
  }
}

type CookieConsentStore = Store<
  CookieConsentState,
  ReturnType<typeof createCookieConsentActions>
>

export const {
  StoreProvider: CookieConsentStoreProvider,
  useStoreContext: useCookieConsentStore
} = createStoreContext<CookieConsentStore>()

export const getInitialCookieConsentState = (
  storedConsent: ConsentState | null
): CookieConsentState => {
  if (storedConsent?.consentVersion === CONSENT_VERSION) {
    return {
      consent: storedConsent,
      isBannerVisible: false,
      isSettingsOpen: false
    }
  }

  return {
    consent: {
      hasConsented: false,
      categories: getDefaultCategories(),
      lastUpdated: null,
      consentVersion: CONSENT_VERSION
    },
    isBannerVisible: true,
    isSettingsOpen: false
  }
}

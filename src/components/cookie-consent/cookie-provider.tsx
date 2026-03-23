import React from 'react'
import type {
  ConsentCategories,
  ConsentCategory,
  ConsentChangeEvent,
  ConsentState,
  CookieConsentConfig,
  CookieConsentContextValue
} from './types'
import {
  getAllAcceptedCategories,
  getDefaultCategories,
  saveConsentState
} from './utils'

const CookieConsentContext =
  React.createContext<CookieConsentContextValue | null>(null)

type CookieConsentProviderProps = {
  children: React.ReactNode
  config: CookieConsentConfig
  initialState: ConsentState | null
}

export const CookieConsentProvider = ({
  children,
  config,
  initialState
}: CookieConsentProviderProps) => {
  const isVersionMatch = initialState?.consentVersion === config.consentVersion

  const [state, setState] = React.useState<ConsentState>(() => {
    if (initialState && isVersionMatch) {
      return initialState
    }

    return {
      hasConsented: false,
      categories: getDefaultCategories(),
      lastUpdated: null,
      consentVersion: config.consentVersion
    }
  })

  const [isBannerVisible, setIsBannerVisible] = React.useState(
    !initialState || !isVersionMatch
  )
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  const previousCategoriesRef = React.useRef<ConsentCategories>(
    state.categories
  )

  const saveAndNotify = (
    categories: ConsentCategories,
    action: ConsentChangeEvent['action']
  ) => {
    const previousCategories = previousCategoriesRef.current

    const newState = {
      hasConsented: true,
      categories,
      lastUpdated: new Date().toISOString(),
      consentVersion: config.consentVersion
    } satisfies ConsentState

    setState(newState)
    saveConsentState(newState)
    setIsBannerVisible(false)

    previousCategoriesRef.current = categories

    config.onConsentChange?.({
      previousCategories,
      currentCategories: categories,
      action
    })
  }

  const acceptAll = () => {
    saveAndNotify(getAllAcceptedCategories(), 'accept_all')
  }

  const rejectAll = () => {
    saveAndNotify(getDefaultCategories(), 'reject_all')
  }

  const updateConsent = (categories: Partial<ConsentCategories>) => {
    const newCategories = {
      ...state.categories,
      ...categories,
      necessary: true
    } satisfies ConsentCategories

    saveAndNotify(newCategories, 'custom')
  }

  const openSettings = () => {
    setIsSettingsOpen(true)
  }

  const closeSettings = () => {
    setIsSettingsOpen(false)
  }

  const matchHasConsent = (category: ConsentCategory) => {
    return state.categories[category] ?? false
  }

  // eslint-disable-next-line no-restricted-syntax -- useMemo prevents all context consumers from re-rendering on every provider render
  const value: CookieConsentContextValue = React.useMemo(() => {
    return {
      state,
      isBannerVisible,
      isSettingsOpen,
      acceptAll,
      rejectAll,
      updateConsent,
      openSettings,
      closeSettings,
      matchHasConsent,
      config
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable config object, functions use latest state via closure
  }, [state, isBannerVisible, isSettingsOpen, config])

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent() {
  const context = React.useContext(CookieConsentContext)

  if (!context) {
    throw new Error(
      'useCookieConsent must be used within a CookieConsentProvider'
    )
  }

  return context
}

import type { LinkOptions } from '@tanstack/react-router'

export type ConsentCategory = 'necessary' | 'analytics'

export type ConsentAction = 'accept_all' | 'reject_all' | 'custom'

export type ConsentCategories = {
  necessary: boolean
  analytics: boolean
}

export type ConsentState = {
  hasConsented: boolean
  categories: ConsentCategories
  consentVersion: string
  lastUpdated: string | null
}

export type CategoryConfig = {
  key: ConsentCategory
  label: string
  description: string
  required?: boolean
}

export type ConsentChangeEvent = {
  previousCategories: ConsentCategories
  currentCategories: ConsentCategories
  action: ConsentAction
}

export type CookieConsentConfig = {
  consentVersion: string
  privacyPolicyUrl: LinkOptions['to']
  categories: readonly CategoryConfig[]
  onConsentChange?: (event: ConsentChangeEvent) => void
}

export type CookieConsentContextValue = {
  state: ConsentState
  isBannerVisible: boolean
  isSettingsOpen: boolean
  acceptAll: () => void
  rejectAll: () => void
  updateConsent: (categories: Partial<ConsentCategories>) => void
  openSettings: () => void
  closeSettings: () => void
  matchHasConsent: (category: ConsentCategory) => boolean
  config: CookieConsentConfig
}

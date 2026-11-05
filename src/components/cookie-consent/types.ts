export type ConsentCategory = 'necessary' | 'analytics'

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

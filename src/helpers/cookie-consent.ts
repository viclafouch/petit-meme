import { z } from 'zod'

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

const CONSENT_STATE_SCHEMA = z.object({
  hasConsented: z.boolean(),
  categories: z.object({
    necessary: z.boolean(),
    analytics: z.boolean()
  }),
  consentVersion: z.string(),
  lastUpdated: z.string().nullable()
}) satisfies z.ZodType<ConsentState>

export const getDefaultCategories = (): ConsentCategories => {
  return {
    necessary: true,
    analytics: false
  }
}

export const getAllAcceptedCategories = (): ConsentCategories => {
  return {
    necessary: true,
    analytics: true
  }
}

export const parseConsentCookie = (
  rawValue: string | undefined | null
): ConsentState | null => {
  if (rawValue === undefined || !rawValue) {
    return null
  }

  try {
    const result = CONSENT_STATE_SCHEMA.safeParse(JSON.parse(rawValue))

    return result.success ? result.data : null
  } catch {
    return null
  }
}

export const matchIsAnalyticsConsented = (state: ConsentState | null) => {
  return state?.hasConsented === true && state.categories.analytics
}

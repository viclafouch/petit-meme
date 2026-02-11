export type Locale = 'en' | 'fr'

export type ValuesByLocale<T> = {
  [key in Locale]: T
}

export const LOCALE_FALLBACK: Locale = 'fr'

import type { Locale } from '~/paraglide/runtime'

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/u

const countryNamesByLocale = new Map<Locale, Intl.DisplayNames>()

function getCountryNames(locale: Locale) {
  const cached = countryNamesByLocale.get(locale)

  if (cached) {
    return cached
  }

  const displayNames = new Intl.DisplayNames(locale, { type: 'region' })

  countryNamesByLocale.set(locale, displayNames)

  return displayNames
}

export const FLAG_CDN_ORIGIN = 'https://flagcdn.com'

export function getCountryFlagUrl(countryCode: string) {
  return `${FLAG_CDN_ORIGIN}/${countryCode.toLowerCase()}.svg`
}

export function getCountryName(countryCode: string, locale: Locale) {
  if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
    return null
  }

  const countryName = getCountryNames(locale).of(countryCode)

  return countryName && countryName !== countryCode ? countryName : null
}

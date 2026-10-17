import { CENTS_PER_EURO, PERCENT_SCALE } from '~/constants/number'
import type { Locale } from '~/paraglide/runtime'

type FormatCurrencyParams = {
  locale: Locale
} & Intl.NumberFormatOptions

const DEFAULT_CURRENCY_OPTIONS = {
  style: 'currency',
  minimumFractionDigits: 0,
  currency: 'EUR'
} as const satisfies Intl.NumberFormatOptions

function formatEuros(
  euros: number,
  { locale, ...options }: FormatCurrencyParams
) {
  return euros.toLocaleString(locale, {
    ...DEFAULT_CURRENCY_OPTIONS,
    ...options
  })
}

export function getRandomFloatInRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function computePercentChange(current: number, previous: number) {
  if (previous === 0) {
    return null
  }

  return Math.round(((current - previous) / previous) * PERCENT_SCALE)
}

export function convertCentsToEuros(cents: number) {
  return cents / CENTS_PER_EURO
}

export function formatCentsToEuros(
  cents: number,
  params: FormatCurrencyParams
) {
  const euros = convertCentsToEuros(cents)

  return formatEuros(euros, params)
}

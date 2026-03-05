import type { Locale } from '@/paraglide/runtime'

type FormatCurrencyParams = {
  locale: Locale
} & Intl.NumberFormatOptions

const DEFAULT_CURRENCY_OPTIONS = {
  style: 'currency',
  minimumFractionDigits: 0,
  currency: 'EUR'
} as const satisfies Intl.NumberFormatOptions

function formatEuros(euros: number, params: FormatCurrencyParams) {
  const { locale, ...options } = params

  return euros.toLocaleString(locale, {
    ...DEFAULT_CURRENCY_OPTIONS,
    ...options
  })
}

export function computePercentChange(current: number, previous: number) {
  if (previous === 0) {
    return null
  }

  return Math.round(((current - previous) / previous) * 100)
}

export function convertCentsToEuros(cents: number) {
  return cents / 100
}

export function formatCentsToEuros(
  cents: number,
  params: FormatCurrencyParams
) {
  const euros = convertCentsToEuros(cents)

  return formatEuros(euros, params)
}

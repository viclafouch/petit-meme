import {
  type Locale,
  LOCALE_FALLBACK,
  type ValuesByLocale
} from '@/i18n/config'

type NumberFormatOptionsWithLocale = Intl.NumberFormatOptions & {
  locale?: Locale
}

const FORMAT_OPTIONS_BY_LOCALE: ValuesByLocale<Intl.NumberFormatOptions> = {
  fr: {
    style: 'currency',
    minimumFractionDigits: 0,
    currency: 'EUR'
  },
  en: {
    style: 'currency',
    minimumFractionDigits: 0,
    currency: 'EUR'
  }
}

function formatEuros(euros: number, options?: NumberFormatOptionsWithLocale) {
  const locale = options?.locale ?? LOCALE_FALLBACK
  const defaultOptions = FORMAT_OPTIONS_BY_LOCALE[locale]

  return euros.toLocaleString(locale, {
    ...defaultOptions,
    ...options
  })
}

function convertCentsToEuros(cents: number) {
  return cents / 100
}

export function formatCentsToEuros(
  cents: number,
  options?: NumberFormatOptionsWithLocale
) {
  const euros = convertCentsToEuros(cents)

  return formatEuros(euros, options)
}

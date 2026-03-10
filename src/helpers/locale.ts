import type { Locale } from '@/paraglide/runtime'

export const getLocaleDisplayName = (locale: Locale, displayLocale: Locale) => {
  const displayNames = new Intl.DisplayNames([displayLocale], {
    type: 'language'
  })

  return displayNames.of(locale) ?? locale
}

type GetSuggestedLocaleParams = {
  browserLanguages: readonly string[]
  currentLocale: Locale
  availableLocales: readonly Locale[]
}

export const getSuggestedLocale = ({
  browserLanguages,
  currentLocale,
  availableLocales
}: GetSuggestedLocaleParams): Locale | null => {
  for (const lang of browserLanguages) {
    const languagePrefix = lang.split('-').at(0)?.toLowerCase()
    const match = availableLocales.find((available) => {
      return available === languagePrefix
    })

    if (match) {
      return match !== currentLocale ? match : null
    }
  }

  return null
}

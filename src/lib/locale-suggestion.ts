import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { getSuggestedLocale, parseAcceptLanguage } from '~/helpers/locale'
import { getLocale, locales } from '~/paraglide/runtime'

const getBrowserLanguages = createIsomorphicFn()
  .server(() => {
    return parseAcceptLanguage(getRequestHeader('accept-language') ?? '')
  })
  .client(() => {
    return navigator.languages
  })

export const getLocaleSuggestion = () => {
  return getSuggestedLocale({
    browserLanguages: getBrowserLanguages(),
    currentLocale: getLocale(),
    availableLocales: locales
  })
}

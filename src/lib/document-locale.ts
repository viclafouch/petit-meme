import {
  assertIsLocale,
  overwriteGetLocale,
  setLocale
} from '~/paraglide/runtime'

const documentLocale = assertIsLocale(document.documentElement.lang)

overwriteGetLocale(() => {
  return documentLocale
})
void setLocale(documentLocale, { reload: false })

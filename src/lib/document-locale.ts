import {
  assertIsLocale,
  overwriteGetLocale,
  setLocale
} from '~/paraglide/runtime'

const documentLocale = assertIsLocale(document.documentElement.lang)

overwriteGetLocale(() => {
  return documentLocale
})

if (!('URLPattern' in globalThis)) {
  await import('urlpattern-polyfill')
}

void setLocale(documentLocale, { reload: false })

import { overwriteGetLocale } from '~/paraglide/runtime'
import { E2E_LOCALE } from './locales'

overwriteGetLocale(() => {
  return E2E_LOCALE
})

export { m } from '~/paraglide/messages.js'

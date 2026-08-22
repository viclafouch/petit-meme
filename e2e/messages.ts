import { overwriteGetLocale } from '~/paraglide/runtime'
import { E2E_LOCALE } from './locales'

// Tests name what they click the way a screen reader announces it, so they ask
// the app for the string rather than keeping a copy of it. The Playwright
// project pins `locale: 'fr-FR'` on the browser; this pins the same locale on
// the message resolver, which in this process has no request to read it from.
overwriteGetLocale(() => {
  return E2E_LOCALE
})

export { m } from '~/paraglide/messages.js'

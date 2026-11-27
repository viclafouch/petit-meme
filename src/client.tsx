// oxlint-disable-next-line import/no-unassigned-import -- the document locale, and the URLPattern polyfill it awaits where the browser lacks it, must be ready before any module reads them
import '~/lib/document-locale'
import { hydrateRoot } from 'react-dom/client'
import { z } from 'zod'
import { StartClient } from '@tanstack/react-start/client'
import { captureInstallPrompt } from '~/lib/install-app'
import { runInBackground } from '~/lib/main-thread'
import {
  keepEarlyErrors,
  loadSentry,
  reportReactError
} from '~/lib/sentry-client'
import { registerServiceWorker } from '~/lib/service-worker'
import { reloadOnStaleChunk } from '~/lib/stale-chunk-reload'
import { preloadHls } from '~/lib/video'
import { getLocale, type Locale } from '~/paraglide/runtime'

keepEarlyErrors()
reloadOnStaleChunk()
runInBackground(preloadHls)
registerServiceWorker()
captureInstallPrompt()

const ZOD_LOCALE_IMPORTS = {
  fr: () => {
    return import('zod/v4/locales/fr.js')
  },
  en: () => {
    return import('zod/v4/locales/en.js')
  }
} as const satisfies Record<
  Locale,
  () => Promise<{ default: () => { localeError: z.core.$ZodErrorMap } }>
>

const zodLocaleModule = await ZOD_LOCALE_IMPORTS[getLocale()]()
z.config(zodLocaleModule.default())

hydrateRoot(document, <StartClient />, {
  onUncaughtError: reportReactError,
  onRecoverableError: reportReactError
})

runInBackground(loadSentry)

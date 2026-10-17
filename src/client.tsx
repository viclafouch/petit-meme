// oxlint-disable-next-line import/no-unassigned-import -- Sentry init must run before any other module
import '~/instrument.client'
import { hydrateRoot } from 'react-dom/client'
import { z } from 'zod'
import { StartClient } from '@tanstack/react-start/client'
import { getLocale, type Locale } from '~/paraglide/runtime'

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

hydrateRoot(document, <StartClient />)

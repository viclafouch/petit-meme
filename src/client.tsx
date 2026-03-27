import { hydrateRoot } from 'react-dom/client'
import { z } from 'zod'
import { RouterClient } from '@tanstack/react-router/ssr/client'
import { getLocale } from '~/paraglide/runtime'
import type { Locale } from '~/paraglide/runtime'
import { getRouter } from './router'

const ZOD_LOCALE_IMPORTS = {
  fr: () => {
    return import('zod/v4/locales/fr.js')
  },
  en: () => {
    return import('zod/v4/locales/en.js')
  }
} as const satisfies Record<
  Locale,
  () => Promise<{ default: () => { localeError: z.ZodErrorMap } }>
>

const zodLocaleModule = await ZOD_LOCALE_IMPORTS[getLocale()]()
z.config(zodLocaleModule.default())

const router = getRouter()

hydrateRoot(document, <RouterClient router={router} />)

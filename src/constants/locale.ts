import { z } from 'zod'
import { locales } from '~/paraglide/runtime'

export const LOCALE_SCHEMA = z.object({ locale: z.enum(locales) })

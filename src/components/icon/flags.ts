import type React from 'react'
import type { MemeContentLocale } from '~/db/generated/prisma/enums'
import type { Locale } from '~/paraglide/runtime'
import { FlagFr } from './flag-fr'
import { FlagGb } from './flag-gb'

type FlagComponent = React.ComponentType<React.ComponentProps<'svg'>>

export const LOCALE_FLAGS = {
  fr: FlagFr,
  en: FlagGb
} as const satisfies Record<Locale, FlagComponent>

export const CONTENT_LOCALE_FLAGS = {
  FR: FlagFr,
  EN: FlagGb,
  UNIVERSAL: null
} as const satisfies Record<MemeContentLocale, FlagComponent | null>

export const FLAG_ICON_CLASS = 'size-4 shrink-0 rounded-sm'

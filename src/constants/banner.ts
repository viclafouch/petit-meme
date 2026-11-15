import {
  COOKIE_ANNOUNCEMENT_DISMISSED_KEY,
  COOKIE_LOCALE_BANNER_DISMISSED_KEY
} from '~/constants/cookie'

export type BannerDismissal = {
  cookieKey: string
  dismissedValue: string
}

export const ANNOUNCEMENT_DAY = '2026-11-15'

export const LOCALE_BANNER_DISMISSAL = {
  cookieKey: COOKIE_LOCALE_BANNER_DISMISSED_KEY,
  dismissedValue: '1'
} as const satisfies BannerDismissal

export const ANNOUNCEMENT_BANNER_DISMISSAL = {
  cookieKey: COOKIE_ANNOUNCEMENT_DISMISSED_KEY,
  dismissedValue: ANNOUNCEMENT_DAY
} as const satisfies BannerDismissal

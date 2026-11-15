import { createClientOnlyFn, createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { ANNOUNCEMENT_DAY } from '~/constants/announcement'
import { COOKIE_ANNOUNCEMENT_DISMISSED_KEY } from '~/constants/cookie'
import { ONE_YEAR_IN_SECONDS } from '~/constants/time'
import { createClientCookie, readClientCookie } from '~/lib/cookie'

export const getAnnouncementDismissed = createIsomorphicFn()
  .server(() => {
    return getCookie(COOKIE_ANNOUNCEMENT_DISMISSED_KEY) === ANNOUNCEMENT_DAY
  })
  .client(() => {
    return (
      readClientCookie(COOKIE_ANNOUNCEMENT_DISMISSED_KEY) === ANNOUNCEMENT_DAY
    )
  })

export const dismissAnnouncement = createClientOnlyFn(() => {
  createClientCookie(COOKIE_ANNOUNCEMENT_DISMISSED_KEY, ANNOUNCEMENT_DAY, {
    maxAge: ONE_YEAR_IN_SECONDS
  })
})

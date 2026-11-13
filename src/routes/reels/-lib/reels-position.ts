import { createClientOnlyFn } from '@tanstack/react-start'
import { COOKIE_REELS_POSITION_KEY } from '~/constants/cookie'
import type { ReelsCursor } from '~/constants/reels'
import { THIRTY_DAYS_IN_SECONDS } from '~/constants/time'
import { toReelsPositionCookie } from '~/helpers/reels'
import { createClientCookie } from '~/lib/cookie'

export const rememberNextUnseenReel = createClientOnlyFn(
  ({ seed, offset }: NonNullable<ReelsCursor>) => {
    createClientCookie(
      COOKIE_REELS_POSITION_KEY,
      toReelsPositionCookie({ seed, offset: offset + 1 }),
      { maxAge: THIRTY_DAYS_IN_SECONDS }
    )
  }
)

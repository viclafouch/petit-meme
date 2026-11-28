import React from 'react'
import {
  hasSeenIntro,
  markIntroSeen,
  rememberIntro
} from '~/lib/intro-once-per-session'

export const useIntroOncePerSession = (introKey: string) => {
  React.useLayoutEffect(() => {
    if (hasSeenIntro(introKey)) {
      markIntroSeen(introKey)

      return
    }

    rememberIntro(introKey)
  }, [introKey])
}

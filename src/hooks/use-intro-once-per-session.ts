import React from 'react'
import { playIntroOncePerSession } from '~/lib/intro-once-per-session'

export const useIntroOncePerSession = <TElement extends Element>(
  introKey: string
) => {
  const introRef = React.useRef<TElement>(null)

  React.useLayoutEffect(() => {
    if (introRef.current) {
      playIntroOncePerSession(introRef.current, introKey)
    }
  }, [introKey])

  return introRef
}

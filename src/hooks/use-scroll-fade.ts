import React from 'react'

export const useNeedsScrollFadeFallback = (): boolean => {
  // eslint-disable-next-line react/hook-use-state -- static value, setter never needed
  const [needsFallback] = React.useState(() => {
    return (
      typeof CSS !== 'undefined' &&
      !CSS.supports('animation-timeline', 'scroll()')
    )
  })

  return needsFallback
}

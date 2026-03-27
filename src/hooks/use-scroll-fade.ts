import React from 'react'

export const useNeedsScrollFadeFallback = (): boolean => {
  const [needsFallback] = React.useState(() => {
    return (
      typeof CSS !== 'undefined' &&
      !CSS.supports('animation-timeline', 'scroll()')
    )
  })

  return needsFallback
}

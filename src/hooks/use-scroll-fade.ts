import React from 'react'

export const useNeedsScrollFadeFallback = (): boolean => {
  // oxlint-disable-next-line react/hook-use-state -- no setter needed, useState used as one-time initializer
  const [needsFallback] = React.useState(() => {
    return (
      typeof CSS !== 'undefined' &&
      !CSS.supports('animation-timeline', 'scroll()')
    )
  })

  return needsFallback
}

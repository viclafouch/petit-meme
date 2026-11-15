import React from 'react'
import { subscribeToNothing } from '~/helpers/external-store'

const getNeedsFallbackSnapshot = () => {
  return !CSS.supports(
    '(animation-timeline: scroll()) and (animation-range: 0% 100%)'
  )
}

const getServerNeedsFallbackSnapshot = () => {
  return false
}

export const useNeedsScrollFadeFallback = (): boolean => {
  return React.useSyncExternalStore(
    subscribeToNothing,
    getNeedsFallbackSnapshot,
    getServerNeedsFallbackSnapshot
  )
}

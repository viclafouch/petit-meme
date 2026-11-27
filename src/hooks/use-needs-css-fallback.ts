import React from 'react'
import { subscribeToNothing } from '~/helpers/external-store'

const getServerNeedsFallbackSnapshot = () => {
  return false
}

export const useNeedsCssFallback = (supportCondition: string): boolean => {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => {
      return !CSS.supports(supportCondition)
    },
    getServerNeedsFallbackSnapshot
  )
}

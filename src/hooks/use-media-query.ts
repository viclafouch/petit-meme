import React from 'react'

const getServerSnapshot = () => {
  return false
}

export const useMediaQuery = (query: string) => {
  const subscribe = (onStoreChange: () => void) => {
    const mediaQueryList = window.matchMedia(query)
    mediaQueryList.addEventListener('change', onStoreChange)

    return () => {
      mediaQueryList.removeEventListener('change', onStoreChange)
    }
  }

  const getSnapshot = () => {
    return window.matchMedia(query).matches
  }

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

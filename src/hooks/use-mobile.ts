import React from 'react'

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

const subscribe = (callback: () => void) => {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)

  return () => {
    mql.removeEventListener('change', callback)
  }
}

const getSnapshot = () => {
  return window.matchMedia(QUERY).matches
}

const getServerSnapshot = () => {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

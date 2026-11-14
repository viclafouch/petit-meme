const STANDALONE_QUERY = '(display-mode: standalone)'

export type DisplayMode = 'standalone' | 'browser'

export const matchIsStandalone = () => {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    ('standalone' in navigator && navigator.standalone === true)
  )
}

export const getDisplayMode = (): DisplayMode => {
  return matchIsStandalone() ? 'standalone' : 'browser'
}

export const subscribeToDisplayMode = (listener: () => void) => {
  const standaloneQuery = window.matchMedia(STANDALONE_QUERY)

  standaloneQuery.addEventListener('change', listener)

  return () => {
    standaloneQuery.removeEventListener('change', listener)
  }
}

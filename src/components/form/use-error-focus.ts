import React from 'react'

const MOTION_ALLOWED_QUERY = '(prefers-reduced-motion: no-preference)'

export const useErrorFocus = (error: Error | null) => {
  const errorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (error !== null && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: window.matchMedia(MOTION_ALLOWED_QUERY).matches
          ? 'smooth'
          : 'auto',
        block: 'nearest'
      })
      errorRef.current.focus({ preventScroll: true })
    }
  }, [error])

  return errorRef
}

import React from 'react'

export const useErrorFocus = (error: Error | null) => {
  const errorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (error !== null && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
      errorRef.current.focus()
    }
  }, [error])

  return errorRef
}

import React from 'react'

export const useErrorFocus = (error: unknown) => {
  const errorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
      errorRef.current.focus()
    }
  }, [error])

  return errorRef
}

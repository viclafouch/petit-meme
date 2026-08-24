import React from 'react'
import { inertOthers } from 'aria-hidden'

export const useInertBackground = () => {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const restoreBackgroundRef = React.useRef<(() => void) | null>(null)

  const restoreBackground = () => {
    restoreBackgroundRef.current?.()
    restoreBackgroundRef.current = null
  }

  React.useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return () => {}
    }

    const liveRegions = document.querySelectorAll('[aria-live]')

    restoreBackgroundRef.current = inertOthers([dialog, ...liveRegions])

    return restoreBackground
  }, [])

  const letFocusLeave = () => {
    restoreBackground()

    const dialog = dialogRef.current

    if (dialog) {
      dialog.inert = true
    }
  }

  return { dialogRef, letFocusLeave }
}

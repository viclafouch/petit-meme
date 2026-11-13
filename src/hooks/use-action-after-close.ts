import React from 'react'

export const useActionAfterClose = () => {
  const pendingActionRef = React.useRef<(() => void) | null>(null)

  const runAfterClose = (action: () => void) => {
    pendingActionRef.current = action
  }

  const handleOpenChangeComplete = (isOpen: boolean) => {
    const pendingAction = pendingActionRef.current

    if (isOpen || pendingAction === null) {
      return
    }

    pendingActionRef.current = null
    pendingAction()
  }

  return { runAfterClose, handleOpenChangeComplete }
}

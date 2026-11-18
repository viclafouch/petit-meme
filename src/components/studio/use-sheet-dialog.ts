import React from 'react'

const STAYS_INTERACTIVE = [
  'script',
  'style',
  '[aria-live]',
  ':has([data-sonner-toaster])'
].join(',')

const makeOutsideInert = (dialog: HTMLElement) => {
  const madeInert: Element[] = []
  let node = dialog

  while (node.parentElement !== null && node !== document.body) {
    const parent: HTMLElement = node.parentElement

    for (const sibling of parent.children) {
      if (
        sibling !== node &&
        !sibling.hasAttribute('inert') &&
        !sibling.matches(STAYS_INTERACTIVE)
      ) {
        sibling.setAttribute('inert', '')
        madeInert.push(sibling)
      }
    }

    node = parent
  }

  return () => {
    for (const element of madeInert) {
      element.removeAttribute('inert')
    }
  }
}

const pauseMediaOutside = (dialog: HTMLElement) => {
  for (const media of document.querySelectorAll<HTMLMediaElement>(
    'video, audio'
  )) {
    if (!dialog.contains(media)) {
      media.pause()
    }
  }
}

const matchIsFocusInside = (dialog: HTMLElement) => {
  const { activeElement } = document

  return (
    activeElement === null ||
    activeElement === document.body ||
    dialog.contains(activeElement)
  )
}

export const useSheetDialog = (onClose: () => void) => {
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const handleClose = React.useEffectEvent(onClose)

  React.useEffect(() => {
    const dialog = dialogRef.current

    if (dialog === null) {
      return () => {}
    }

    const restoreOutside = makeOutsideInert(dialog)

    pauseMediaOutside(dialog)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        matchIsFocusInside(dialog)
      ) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      restoreOutside()
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return dialogRef
}

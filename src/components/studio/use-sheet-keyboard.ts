import React from 'react'

const KEYBOARD_THRESHOLD_PX = 120
const KEYBOARD_WAIT_MS = 700
const VIEWPORT_SETTLE_MS = 220
const REST_SETTLE_MS = 350

export const useSheetKeyboard = () => {
  const sheetRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const sheet = sheetRef.current
    const viewport = globalThis.visualViewport

    if (sheet === null || viewport === undefined || viewport === null) {
      return () => {}
    }

    let frame = 0
    let waitTimer = 0
    let settleTimer = 0
    let restTimer = 0
    let isWaitingForKeyboard = false

    const findStage = () => {
      return sheet.querySelector<HTMLElement>('.studio-editor-stage')
    }

    const lockStage = () => {
      const stage = findStage()

      if (stage === null || sheet.hasAttribute('data-stage-locked')) {
        return
      }

      sheet.style.setProperty(
        '--stage-lock',
        `${stage.getBoundingClientRect().height}px`
      )

      if (!sheet.hasAttribute('data-settling')) {
        sheet.style.setProperty(
          '--rest-height',
          `${sheet.getBoundingClientRect().height}px`
        )
      }

      sheet.setAttribute('data-stage-locked', '')
    }

    const unlockStage = () => {
      sheet.removeAttribute('data-stage-locked')
    }

    const revealFocusedCaption = () => {
      const focused = document.activeElement

      if (
        !(focused instanceof HTMLTextAreaElement) ||
        !sheet.contains(focused)
      ) {
        return
      }

      const visibleBottom = viewport.offsetTop + viewport.height
      const { top, bottom } = focused.getBoundingClientRect()

      if (bottom > visibleBottom || top < viewport.offsetTop) {
        focused.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }

    const matchIsCaptionFocused = () => {
      return (
        document.activeElement instanceof HTMLTextAreaElement &&
        sheet.contains(document.activeElement)
      )
    }

    const matchIsKeyboardOpen = () => {
      return window.innerHeight - viewport.height > KEYBOARD_THRESHOLD_PX
    }

    const settleRest = () => {
      window.clearTimeout(restTimer)
      restTimer = window.setTimeout(() => {
        sheet.removeAttribute('data-settling')
      }, REST_SETTLE_MS)
    }

    const setEditing = (isEditing: boolean) => {
      if (isEditing) {
        lockStage()
      } else {
        if (sheet.hasAttribute('data-editing')) {
          sheet.setAttribute('data-settling', '')
          settleRest()
        }

        unlockStage()
      }

      sheet.toggleAttribute('data-editing', isEditing)
    }

    const syncViewport = () => {
      cancelAnimationFrame(frame)
      if (sheet.hasAttribute('data-settling')) {
        settleRest()
      }

      frame = requestAnimationFrame(() => {
        sheet.style.setProperty('--vv-height', `${viewport.height}px`)
        sheet.style.setProperty('--vv-top', `${viewport.offsetTop}px`)

        if (matchIsKeyboardOpen()) {
          isWaitingForKeyboard = false
          setEditing(
            matchIsCaptionFocused() || sheet.hasAttribute('data-editing')
          )
          window.clearTimeout(settleTimer)
          settleTimer = window.setTimeout(
            revealFocusedCaption,
            VIEWPORT_SETTLE_MS
          )
        } else if (!isWaitingForKeyboard) {
          setEditing(matchIsCaptionFocused())
        }
      })
    }

    const handleFocusIn = () => {
      if (!matchIsCaptionFocused()) {
        return
      }

      setEditing(true)

      if (!matchIsKeyboardOpen()) {
        isWaitingForKeyboard = true
        window.clearTimeout(waitTimer)
        waitTimer = window.setTimeout(() => {
          isWaitingForKeyboard = false
          syncViewport()
        }, KEYBOARD_WAIT_MS)
      }
    }

    const handleFocusOut = () => {
      requestAnimationFrame(() => {
        if (!matchIsCaptionFocused() && !matchIsKeyboardOpen()) {
          isWaitingForKeyboard = false
          setEditing(false)
        }
      })
    }

    syncViewport()
    viewport.addEventListener('resize', syncViewport)
    viewport.addEventListener('scroll', syncViewport)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(waitTimer)
      window.clearTimeout(settleTimer)
      window.clearTimeout(restTimer)
      viewport.removeEventListener('resize', syncViewport)
      viewport.removeEventListener('scroll', syncViewport)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  return sheetRef
}

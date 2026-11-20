import React from 'react'

const DISMISS_DISTANCE_RATIO = 0.25
const DISMISS_VELOCITY_PX_PER_MS = 0.5
const START_THRESHOLD_PX = 6
const UPWARD_RESISTANCE = 0.15
const SHEET_EASE = 'var(--ease-drawer)'
const SETTLE_TIMING = `var(--duration-sheet) ${SHEET_EASE}`
const DISMISS_MS = 280

type DragState = {
  startY: number
  lastY: number
  lastTime: number
  velocity: number
  isDragging: boolean
  fromContent: boolean
}

type UseSheetDragParams = {
  sheetRef: React.RefObject<HTMLElement | null>
  scrimRef: React.RefObject<HTMLElement | null>
  onDismiss: () => void
}

export const useSheetDrag = ({
  sheetRef,
  scrimRef,
  onDismiss
}: UseSheetDragParams) => {
  const handleDismiss = React.useEffectEvent(onDismiss)

  React.useEffect(() => {
    const sheet = sheetRef.current
    const scrim = scrimRef.current

    if (sheet === null) {
      return () => {}
    }

    let drag: DragState | null = null

    const reset = () => {
      sheet.style.transition = ''
      sheet.style.transform = ''

      if (scrim !== null) {
        scrim.style.transition = ''
        scrim.style.opacity = ''
      }
    }

    reset()

    const write = (offset: number) => {
      const visible = offset > 0 ? offset : offset * UPWARD_RESISTANCE
      sheet.style.transform = `translate3d(0, ${visible}px, 0)`

      if (scrim !== null) {
        scrim.style.opacity = String(
          Math.max(0, 1 - visible / sheet.offsetHeight)
        )
      }
    }

    const matchIsEditing = () => {
      return sheet.hasAttribute('data-editing')
    }

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      const target = event.target instanceof Element ? event.target : null

      if (
        touch === undefined ||
        event.touches.length > 1 ||
        matchIsEditing() ||
        target === null
      ) {
        drag = null

        return
      }

      const editor = sheet.querySelector('.studio-editor')
      const fromContent = editor !== null && editor.contains(target)

      if (
        fromContent &&
        (editor.scrollTop > 0 ||
          target.closest('textarea, [role="slider"]') !== null)
      ) {
        drag = null

        return
      }

      drag = {
        startY: touch.clientY,
        lastY: touch.clientY,
        lastTime: event.timeStamp,
        velocity: 0,
        isDragging: false,
        fromContent
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]

      if (drag === null || touch === undefined) {
        return
      }

      const offset = touch.clientY - drag.startY

      if (!drag.isDragging) {
        if (Math.abs(offset) < START_THRESHOLD_PX) {
          return
        }

        if (offset < 0 && drag.fromContent) {
          drag = null

          return
        }

        drag.isDragging = true
        sheet.style.transition = 'none'

        if (scrim !== null) {
          scrim.style.transition = 'none'
        }
      }

      event.preventDefault()
      const elapsed = Math.max(1, event.timeStamp - drag.lastTime)
      drag.velocity = (touch.clientY - drag.lastY) / elapsed
      drag.lastY = touch.clientY
      drag.lastTime = event.timeStamp
      write(offset)
    }

    const handleTouchEnd = () => {
      if (drag === null || !drag.isDragging) {
        drag = null

        return
      }

      const offset = drag.lastY - drag.startY
      const shouldDismiss =
        offset > sheet.offsetHeight * DISMISS_DISTANCE_RATIO ||
        drag.velocity > DISMISS_VELOCITY_PX_PER_MS
      drag = null

      if (shouldDismiss) {
        sheet.style.transition = `transform ${DISMISS_MS}ms ${SHEET_EASE}`
        sheet.style.transform = 'translate3d(0, 100lvh, 0)'

        if (scrim !== null) {
          scrim.style.transition = `opacity ${DISMISS_MS}ms ease-out`
          scrim.style.opacity = '0'
        }

        window.setTimeout(() => {
          handleDismiss()
        }, DISMISS_MS)

        return
      }

      sheet.style.transition = `transform ${SETTLE_TIMING}`
      sheet.style.transform = 'translate3d(0, 0, 0)'

      if (scrim !== null) {
        scrim.style.transition = `opacity ${SETTLE_TIMING}`
        scrim.style.opacity = '1'
      }
    }

    sheet.addEventListener('touchstart', handleTouchStart, { passive: true })
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false })
    sheet.addEventListener('touchend', handleTouchEnd)
    sheet.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart)
      sheet.removeEventListener('touchmove', handleTouchMove)
      sheet.removeEventListener('touchend', handleTouchEnd)
      sheet.removeEventListener('touchcancel', handleTouchEnd)
      reset()
    }
  }, [sheetRef, scrimRef])
}

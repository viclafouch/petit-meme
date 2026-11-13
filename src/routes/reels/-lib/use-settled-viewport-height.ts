import React from 'react'
import { useDebouncedCallback } from '@tanstack/react-pacer'

const VIEWPORT_SETTLE_MS = 250

export const useSettledViewportHeight = (
  pageRef: React.RefObject<HTMLElement | null>
) => {
  const writeViewportHeight = () => {
    pageRef.current?.style.setProperty(
      '--reels-viewport-height',
      `${window.innerHeight}px`
    )
  }

  const writeViewportHeightOnceSettled = useDebouncedCallback(
    writeViewportHeight,
    { wait: VIEWPORT_SETTLE_MS }
  )

  const writeInitialViewportHeight = React.useEffectEvent(writeViewportHeight)

  const followViewportResize = React.useEffectEvent(() => {
    writeViewportHeightOnceSettled()
  })

  React.useEffect(() => {
    writeInitialViewportHeight()

    const handleResize = () => {
      followViewportResize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
}

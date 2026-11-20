import React from 'react'

const CONTROLS_IDLE_DELAY_MS = 2500

export const listenToVideoTaps = (
  video: HTMLVideoElement,
  onTap: () => void
) => {
  const player = video.closest<HTMLElement>('media-controller')

  if (!player) {
    return () => {}
  }

  let isVideoTap = false
  const listeners = new AbortController()
  const { signal } = listeners

  player.addEventListener(
    'pointerdown',
    (event) => {
      isVideoTap = event.pointerType === 'touch' && event.target === video
    },
    { signal }
  )
  player.addEventListener(
    'pointercancel',
    () => {
      isVideoTap = false
    },
    { signal }
  )
  player.addEventListener(
    'click',
    (event) => {
      if (!isVideoTap) {
        return
      }

      isVideoTap = false
      event.stopPropagation()
      event.preventDefault()
      onTap()
    },
    { signal, capture: true }
  )

  return () => {
    listeners.abort()
  }
}

const matchIsHoverPointer = (pointerType: string) => {
  return pointerType !== 'touch'
}

const matchIsFocusingControls = (controls: HTMLElement) => {
  return controls.matches(':has(:focus-visible)')
}

const matchIsHoldingControls = (
  controls: HTMLElement,
  isHoverPointer: boolean
) => {
  if (
    matchIsFocusingControls(controls) ||
    controls.matches(':has([data-dragging])')
  ) {
    return true
  }

  return (
    isHoverPointer &&
    controls.matches(':has(button:hover, .meme-scrubber-control:hover)')
  )
}

type UseControlsVisibilityParams = {
  video: HTMLVideoElement | null
  isPaused: boolean
}

export const useControlsVisibility = ({
  video,
  isPaused
}: UseControlsVisibilityParams) => {
  const controlsRef = React.useRef<HTMLDivElement>(null)
  const isHoverPointerRef = React.useRef(false)
  const [isShown, setIsShown] = React.useState(false)

  React.useEffect(() => {
    const player = video?.closest<HTMLElement>('media-controller')

    if (!video || !player) {
      return () => {}
    }

    const listeners = new AbortController()
    const { signal } = listeners
    const stopListeningToTaps = listenToVideoTaps(video, () => {
      setIsShown((wasShown) => {
        return !wasShown
      })
    })

    for (const eventType of ['pointerdown', 'pointermove'] as const) {
      player.addEventListener(
        eventType,
        (event) => {
          isHoverPointerRef.current = matchIsHoverPointer(event.pointerType)

          if (eventType === 'pointermove' && isHoverPointerRef.current) {
            setIsShown(true)
          }
        },
        { signal }
      )
    }

    player.addEventListener(
      'pointerleave',
      (event) => {
        const controls = controlsRef.current

        if (
          matchIsHoverPointer(event.pointerType) &&
          !(controls && matchIsFocusingControls(controls))
        ) {
          setIsShown(false)
        }
      },
      { signal }
    )
    player.addEventListener(
      'focusin',
      (event) => {
        if (
          event.target instanceof Element &&
          event.target.matches(':focus-visible')
        ) {
          setIsShown(true)
        }
      },
      { signal }
    )
    player.addEventListener(
      'keyup',
      () => {
        setIsShown(true)
      },
      { signal }
    )

    return () => {
      listeners.abort()
      stopListeningToTaps()
    }
  }, [video])

  React.useEffect(() => {
    const player = video?.closest<HTMLElement>('media-controller')
    const controls = controlsRef.current

    if (!isShown || isPaused || !player || !controls) {
      return () => {}
    }

    let hideTimeoutId = 0

    const hideWhenIdle = () => {
      if (matchIsHoldingControls(controls, isHoverPointerRef.current)) {
        restartIdleDelay()

        return
      }

      setIsShown(false)
    }

    const restartIdleDelay = () => {
      window.clearTimeout(hideTimeoutId)
      hideTimeoutId = window.setTimeout(hideWhenIdle, CONTROLS_IDLE_DELAY_MS)
    }

    restartIdleDelay()

    const listeners = new AbortController()
    const { signal } = listeners

    for (const eventType of ['pointermove', 'pointerdown', 'keyup']) {
      player.addEventListener(eventType, restartIdleDelay, { signal })
    }

    return () => {
      listeners.abort()
      window.clearTimeout(hideTimeoutId)
    }
  }, [isShown, isPaused, video])

  return { controlsRef, isShown }
}

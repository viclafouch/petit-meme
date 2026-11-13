import React from 'react'

export type VideoState = 'playing' | 'paused' | 'waiting'

const VIDEO_STATE_EVENTS = [
  'playing',
  'pause',
  'emptied',
  'waiting'
] as const satisfies readonly (keyof HTMLMediaElementEventMap)[]

const VIDEO_STATE_BY_EVENT = {
  playing: 'playing',
  pause: 'paused',
  emptied: 'paused',
  waiting: 'waiting'
} as const satisfies Record<(typeof VIDEO_STATE_EVENTS)[number], VideoState>

export const useVideoState = (video: HTMLVideoElement | null) => {
  const [videoState, setVideoState] = React.useState<VideoState>('paused')

  React.useEffect(() => {
    if (!video) {
      return () => {}
    }

    const abortController = new AbortController()

    for (const eventName of VIDEO_STATE_EVENTS) {
      video.addEventListener(
        eventName,
        () => {
          setVideoState(VIDEO_STATE_BY_EVENT[eventName])
        },
        { signal: abortController.signal }
      )
    }

    return () => {
      abortController.abort()
    }
  }, [video])

  return videoState
}

import React from 'react'
import { playVideoWhenReady, stopVideo } from '~/utils/video'

type UseVideoPlaybackParams = {
  video: HTMLVideoElement | null
  shouldPlay: boolean
  shouldRewind?: boolean
}

export const useVideoPlayback = ({
  video,
  shouldPlay,
  shouldRewind = false
}: UseVideoPlaybackParams) => {
  React.useEffect(() => {
    if (!video) {
      return () => {}
    }

    if (!shouldPlay) {
      if (shouldRewind) {
        stopVideo(video)
      } else {
        video.pause()
      }

      return () => {}
    }

    const playAbortController = new AbortController()
    void playVideoWhenReady({ video, signal: playAbortController.signal })

    return () => {
      playAbortController.abort()
    }
  }, [video, shouldPlay, shouldRewind])
}

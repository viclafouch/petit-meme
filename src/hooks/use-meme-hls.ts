import React from 'react'
import { buildVideoStreamUrl } from '~/lib/bunny'
import { attachHlsSource } from '~/utils/video'

type UseMemeHlsParams = {
  bunnyId: string
}

export const useMemeHls = ({ bunnyId }: UseMemeHlsParams) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [failedBunnyId, setFailedBunnyId] = React.useState<string | null>(null)
  const hasPlaybackFailed = failedBunnyId === bunnyId

  React.useEffect(() => {
    const video = videoRef.current

    if (!video || hasPlaybackFailed) {
      return () => {}
    }

    const detachHlsSource = attachHlsSource({
      video,
      videoSrc: buildVideoStreamUrl(bunnyId),
      onFatalError: () => {
        setFailedBunnyId(bunnyId)
      }
    })

    return () => {
      detachHlsSource()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [bunnyId, hasPlaybackFailed])

  const handleRetryPlayback = () => {
    setFailedBunnyId(null)
  }

  const playbackFailure = hasPlaybackFailed
    ? { handleRetry: handleRetryPlayback }
    : null

  return { videoRef, playbackFailure }
}

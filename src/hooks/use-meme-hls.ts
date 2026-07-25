import React from 'react'
import { buildVideoStreamUrl } from '~/lib/bunny'
import { attachHlsSource } from '~/utils/video'

type UseMemeHlsParams = {
  bunnyId: string
}

export const useMemeHls = ({ bunnyId }: UseMemeHlsParams) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return () => {}
    }

    const detachHlsSource = attachHlsSource({
      video,
      videoSrc: buildVideoStreamUrl(bunnyId)
    })

    return () => {
      detachHlsSource()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [bunnyId])

  return { videoRef }
}

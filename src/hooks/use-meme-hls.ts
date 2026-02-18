import React from 'react'
import Hls from 'hls.js'
import { buildVideoStreamUrl } from '@/lib/bunny'

type UseMemeHlsParams = {
  memeId: string
  bunnyId: string
}

export const useMemeHls = ({ memeId, bunnyId }: UseMemeHlsParams) => {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const hlsRef = React.useRef<Hls>(null)

  React.useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return () => {}
    }

    const videoSrc = buildVideoStreamUrl(bunnyId)

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc
    } else if (Hls.isSupported()) {
      hlsRef.current = new Hls()
      hlsRef.current.loadSource(videoSrc)
      hlsRef.current.attachMedia(video)
    }

    return () => {
      hlsRef.current?.destroy()
    }
  }, [memeId, bunnyId])

  return { videoRef, hlsRef }
}

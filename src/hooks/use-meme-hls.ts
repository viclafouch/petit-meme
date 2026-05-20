import React from 'react'
import Hls from 'hls.js'
import { buildVideoStreamUrl } from '~/lib/bunny'

type UseMemeHlsParams = {
  bunnyId: string
}

export const useMemeHls = ({ bunnyId }: UseMemeHlsParams) => {
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
      // oxlint-disable-next-line import/no-named-as-default-member -- isSupported is a static method, not a named export in hls.js types
    } else if (Hls.isSupported()) {
      hlsRef.current = new Hls()
      hlsRef.current.loadSource(videoSrc)
      hlsRef.current.attachMedia(video)
    }

    return () => {
      hlsRef.current?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [bunnyId])

  return { videoRef, hlsRef }
}

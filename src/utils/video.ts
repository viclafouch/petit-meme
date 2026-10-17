// oxlint-disable-next-line import/no-named-as-default -- hls.js 1.7 types declare the default export only, the named Hls export is missing from them
import Hls from 'hls.js'
import { BUNNY_STATUS, HLS_MIME_TYPE } from '~/constants/bunny'

export const matchIsVideoPlayable = (bunnyStatus: number) => {
  return (
    bunnyStatus >= BUNNY_STATUS.RESOLUTION_FINISHED &&
    bunnyStatus !== BUNNY_STATUS.FAILED &&
    bunnyStatus !== BUNNY_STATUS.PRESIGNED_UPLOAD_FAILED
  )
}

const matchIsNativeHlsPreferred = (video: HTMLVideoElement) => {
  return (
    video.canPlayType(HLS_MIME_TYPE) !== '' && 'ManagedMediaSource' in window
  )
}

type AttachHlsSourceParams = {
  video: HTMLVideoElement
  videoSrc: string
}

export const attachHlsSource = ({ video, videoSrc }: AttachHlsSourceParams) => {
  if (matchIsNativeHlsPreferred(video)) {
    video.src = videoSrc

    return () => {}
  }

  // oxlint-disable-next-line import/no-named-as-default-member -- hls.js 1.7 types declare isSupported as a static method only, not as a named export
  if (!Hls.isSupported()) {
    return () => {}
  }

  const hls = new Hls()
  hls.loadSource(videoSrc)
  hls.attachMedia(video)

  return () => {
    hls.destroy()
  }
}

export const tryPlayVideo = async (video: HTMLVideoElement) => {
  try {
    await video.play()

    return true
  } catch {
    return false
  }
}

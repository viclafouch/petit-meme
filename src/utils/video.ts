import hlsWorkerUrl from 'hls.js/dist/hls.worker.js?url'
import { createClientOnlyFn } from '@tanstack/react-start'
import { BUNNY_STATUS, HLS_MIME_TYPE } from '~/constants/bunny'

const MEDIA_ERROR_RECOVERY_INTERVAL_MS = 5_000

export const matchIsVideoPlayable = (bunnyStatus: number) => {
  return (
    bunnyStatus >= BUNNY_STATUS.RESOLUTION_FINISHED &&
    bunnyStatus !== BUNNY_STATUS.FAILED &&
    bunnyStatus !== BUNNY_STATUS.PRESIGNED_UPLOAD_FAILED
  )
}

const matchIsNativeHlsPreferred = (video: HTMLVideoElement) => {
  const canPlayHlsNatively = video.canPlayType(HLS_MIME_TYPE) !== ''
  const hasMediaSource = 'MediaSource' in window

  return (
    canPlayHlsNatively && ('ManagedMediaSource' in window || !hasMediaSource)
  )
}

const loadHls = async () => {
  try {
    const { default: Hls } = await import('hls.js/light')

    return Hls
  } catch {
    return null
  }
}

export const preloadHls = createClientOnlyFn(() => {
  if (matchIsNativeHlsPreferred(document.createElement('video'))) {
    return
  }

  void loadHls()
})

type AttachHlsSourceParams = {
  video: HTMLVideoElement
  videoSrc: string
  onFatalError: () => void
}

type AttachHlsJsSourceParams = AttachHlsSourceParams & {
  signal: AbortSignal
}

const attachNativeHlsSource = ({
  video,
  videoSrc,
  onFatalError
}: AttachHlsSourceParams) => {
  video.addEventListener('error', onFatalError, { once: true })
  video.src = videoSrc

  return () => {
    video.removeEventListener('error', onFatalError)
  }
}

type StartHlsPlayerParams = AttachHlsJsSourceParams & {
  Hls: NonNullable<Awaited<ReturnType<typeof loadHls>>>
}

const startHlsPlayer = ({
  Hls,
  video,
  videoSrc,
  onFatalError,
  signal
}: StartHlsPlayerParams) => {
  const hls = new Hls({ workerPath: hlsWorkerUrl, loopBackBufferFlush: false })
  let lastMediaErrorRecoveryAt = Number.NEGATIVE_INFINITY

  const failPlayback = () => {
    hls.destroy()
    onFatalError()
  }

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) {
      return
    }

    const now = Date.now()
    const canRecoverMediaError =
      data.type === Hls.ErrorTypes.MEDIA_ERROR &&
      now - lastMediaErrorRecoveryAt >= MEDIA_ERROR_RECOVERY_INTERVAL_MS

    if (!canRecoverMediaError) {
      failPlayback()

      return
    }

    lastMediaErrorRecoveryAt = now
    hls.recoverMediaError()
  })

  signal.addEventListener(
    'abort',
    () => {
      hls.destroy()
    },
    { once: true }
  )

  hls.loadSource(videoSrc)
  hls.attachMedia(video)
}

const attachHlsJsSource = async (params: AttachHlsJsSourceParams) => {
  const Hls = await loadHls()

  if (params.signal.aborted) {
    return
  }

  if (!Hls?.isSupported()) {
    params.onFatalError()

    return
  }

  try {
    startHlsPlayer({ ...params, Hls })
  } catch {
    params.onFatalError()
  }
}

export const attachHlsSource = createClientOnlyFn(
  (params: AttachHlsSourceParams) => {
    if (matchIsNativeHlsPreferred(params.video)) {
      return attachNativeHlsSource(params)
    }

    const abortController = new AbortController()

    void attachHlsJsSource({ ...params, signal: abortController.signal })

    return () => {
      abortController.abort()
    }
  }
)

const tryPlayVideo = async (video: HTMLVideoElement) => {
  try {
    await video.play()

    return true
  } catch {
    return false
  }
}

type PlayVideoWhenReadyParams = {
  video: HTMLVideoElement
  signal: AbortSignal
}

export const playVideoWhenReady = async ({
  video,
  signal
}: PlayVideoWhenReadyParams) => {
  const hasStarted = await tryPlayVideo(video)

  if (hasStarted || signal.aborted) {
    return
  }

  video.addEventListener(
    'canplay',
    () => {
      void tryPlayVideo(video)
    },
    { once: true, signal }
  )
}

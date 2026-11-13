import hlsWorkerUrl from 'hls.js/dist/hls.worker.js?url'
import { createClientOnlyFn } from '@tanstack/react-start'
import { HLS_MIME_TYPE, PLAYABLE_BUNNY_STATUSES } from '~/constants/bunny'

const MEDIA_ERROR_RECOVERY_INTERVAL_MS = 5_000

const MAX_DEVICE_PIXEL_RATIO = 1.5

const BUFFER_CONFIG_BY_BUFFERING = {
  preload: { maxBufferLength: 3, maxMaxBufferLength: 3 },
  play: { maxBufferLength: 30, maxMaxBufferLength: 60 }
} as const satisfies Record<
  string,
  { maxBufferLength: number; maxMaxBufferLength: number }
>

export type VideoBuffering = keyof typeof BUFFER_CONFIG_BY_BUFFERING

type HlsPlayer = InstanceType<NonNullable<Awaited<ReturnType<typeof loadHls>>>>

const hlsPlayerByVideo = new WeakMap<HTMLVideoElement, HlsPlayer>()

const bufferingByVideo = new WeakMap<HTMLVideoElement, VideoBuffering>()

let lastBandwidthEstimate: number | null = null

export const matchIsVideoPlayable = (bunnyStatus: number) => {
  return PLAYABLE_BUNNY_STATUSES.includes(bunnyStatus)
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

const recordBandwidthEstimate = (hls: HlsPlayer) => {
  if (Number.isFinite(hls.bandwidthEstimate)) {
    lastBandwidthEstimate = hls.bandwidthEstimate
  }
}

const destroyHlsPlayer = (video: HTMLVideoElement, hls: HlsPlayer) => {
  recordBandwidthEstimate(hls)
  hlsPlayerByVideo.delete(video)
  hls.destroy()
}

const startHlsPlayer = ({
  Hls,
  video,
  videoSrc,
  onFatalError,
  signal
}: StartHlsPlayerParams) => {
  const hls = new Hls({
    workerPath: hlsWorkerUrl,
    loopBackBufferFlush: false,
    capLevelToPlayerSize: true,
    maxDevicePixelRatio: MAX_DEVICE_PIXEL_RATIO,
    ...(lastBandwidthEstimate === null
      ? {}
      : { abrEwmaDefaultEstimate: lastBandwidthEstimate }),
    ...BUFFER_CONFIG_BY_BUFFERING[bufferingByVideo.get(video) ?? 'play']
  })
  let lastMediaErrorRecoveryAt = Number.NEGATIVE_INFINITY

  hlsPlayerByVideo.set(video, hls)
  hls.on(Hls.Events.FRAG_LOADED, () => {
    recordBandwidthEstimate(hls)
  })

  const failPlayback = () => {
    destroyHlsPlayer(video, hls)
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
      destroyHlsPlayer(video, hls)
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

export const setVideoBuffering = (
  video: HTMLVideoElement,
  buffering: VideoBuffering
) => {
  bufferingByVideo.set(video, buffering)
  video.preload = buffering === 'play' ? 'auto' : 'metadata'

  const hls = hlsPlayerByVideo.get(video)

  if (hls) {
    Object.assign(hls.config, BUFFER_CONFIG_BY_BUFFERING[buffering])
  }
}

const FULLY_BUFFERED_MARGIN_SECONDS = 0.25

const MIN_BUFFER_AHEAD_SECONDS = 10

export const matchIsVideoBuffered = ({
  buffered,
  currentTime,
  duration
}: HTMLVideoElement) => {
  if (buffered.length === 0 || !Number.isFinite(duration)) {
    return false
  }

  const bufferedEnd = buffered.end(buffered.length - 1)

  return (
    bufferedEnd >= duration - FULLY_BUFFERED_MARGIN_SECONDS ||
    bufferedEnd - currentTime >= MIN_BUFFER_AHEAD_SECONDS
  )
}

const tryPlayVideo = async (video: HTMLVideoElement) => {
  try {
    await video.play()

    return true
  } catch {
    return false
  }
}

export const seekVideoOnceReady = (video: HTMLVideoElement, time: number) => {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    video.currentTime = time

    return
  }

  video.addEventListener(
    'loadedmetadata',
    () => {
      video.currentTime = time
    },
    { once: true }
  )
}

export const stopVideo = (video: HTMLVideoElement) => {
  video.pause()
  video.currentTime = 0
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

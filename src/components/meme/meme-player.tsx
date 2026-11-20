import React from 'react'
import {
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react'
import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector
} from 'media-chrome/react/media-store'
import { useSpinDelay } from 'spin-delay'
import { Slider } from '@base-ui/react/slider'
import { ClientOnly } from '@tanstack/react-router'
import {
  listenToVideoTaps,
  useControlsVisibility
} from '~/components/meme/use-controls-visibility'
import { VideoPlaybackError } from '~/components/meme/video-playback-error'
import { VideoPlayer } from '~/components/ui/kibo-ui/video-player'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '~/components/ui/tooltip'
import { PERCENT_SCALE } from '~/constants/number'
import { formatClockDuration } from '~/helpers/duration'
import { buildVideoFirstFrameUrl } from '~/lib/bunny-public-urls'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import memePlayerCss from './meme-player.css?url'

const SCRUBBER_STEP_SECONDS = 0.01

const LOADING_SPINNER_DELAY = { delay: 700, minDuration: 300, ssr: false }

const PLAYBACK_PROGRESS_PROPERTY = '--meme-scrubber-progress'

type PlaybackFailure = {
  handleRetry: () => void
}

const usePlayback = () => {
  const dispatch = useMediaDispatch()
  const isPaused =
    useMediaSelector((state) => {
      return state.mediaPaused
    }) ?? true

  return {
    isPaused,
    togglePlay: () => {
      dispatch({
        type: isPaused
          ? MediaActionTypes.MEDIA_PLAY_REQUEST
          : MediaActionTypes.MEDIA_PAUSE_REQUEST
      })
    }
  }
}

const playOrReportBlocked = async (
  video: HTMLVideoElement,
  onBlocked: () => void
) => {
  try {
    await video.play()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      onBlocked()
    }
  }
}

type VideoPreload = React.ComponentProps<'video'>['preload']

type MemeVideoElementProps = {
  title: string
  autoPlay: boolean
  muted: boolean
  preload: VideoPreload
  onVideoChange: (video: HTMLVideoElement | null) => void
  onLoadStart: () => void
  onStart: () => void
  onAutoplayBlocked: () => void
}

const MemeVideoElement = ({
  title,
  autoPlay,
  muted,
  preload,
  onVideoChange,
  onLoadStart,
  onStart,
  onAutoplayBlocked
}: MemeVideoElementProps) => {
  const dispatch = useMediaDispatch()
  const videoRef = React.useCallback(
    (video: HTMLVideoElement | null) => {
      onVideoChange(video)
      dispatch({
        type: MediaActionTypes.MEDIA_ELEMENT_CHANGE_REQUEST,
        detail: video
      })
    },
    [dispatch, onVideoChange]
  )

  const handleLoadedMetadata = (
    event: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    if (autoPlay) {
      void playOrReportBlocked(event.currentTarget, onAutoplayBlocked)
    }
  }

  return (
    <video
      slot="media"
      data-testid="meme-video"
      aria-label={title}
      ref={videoRef}
      tabIndex={-1}
      crossOrigin=""
      className="meme-player-video"
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      preload={preload}
      autoPlay={autoPlay}
      muted={muted}
      loop
      onLoadStart={onLoadStart}
      onPlaying={onStart}
      onLoadedMetadata={handleLoadedMetadata}
    />
  )
}

type PlayerButtonProps = {
  label: string
  onClick: () => void
  children: React.ReactNode
  isPressed?: boolean
  className?: string
}

const PlayerButton = ({
  label,
  onClick,
  isPressed,
  className,
  children
}: PlayerButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn('icon-button', className)}
            aria-label={label}
            aria-pressed={isPressed}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

const formatTime = (seconds: number) => {
  return formatClockDuration(Math.floor(seconds), getLocale())
}

const toFiniteSeconds = (seconds: number | undefined) => {
  return seconds !== undefined && Number.isFinite(seconds) ? seconds : 0
}

const useMediaTimes = () => {
  const currentTime = toFiniteSeconds(
    useMediaSelector((state) => {
      return state.mediaCurrentTime
    })
  )
  const duration = toFiniteSeconds(
    useMediaSelector((state) => {
      return state.mediaDuration
    })
  )

  return {
    currentTime,
    duration,
    hasDuration: duration > 0
  }
}

const getBufferedEnd = (buffered: [number, number][] | undefined) => {
  return (
    buffered?.reduce((end, [, rangeEnd]) => {
      return Math.max(end, rangeEnd)
    }, 0) ?? 0
  )
}

const readPlaybackProgress = (video: HTMLVideoElement) => {
  return Number.isFinite(video.duration) && video.duration > 0
    ? video.currentTime / video.duration
    : 0
}

const useFollowPlaybackProgress = (video: HTMLVideoElement | null) => {
  const indicatorRef = React.useRef<HTMLSpanElement>(null)
  const thumbRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!video) {
      return () => {}
    }

    let frameRequestId = 0

    const writeProgress = () => {
      const progress = String(readPlaybackProgress(video))

      for (const element of [indicatorRef.current, thumbRef.current]) {
        element?.style.setProperty(PLAYBACK_PROGRESS_PROPERTY, progress)
      }
    }

    const followFrame = () => {
      writeProgress()
      frameRequestId = requestAnimationFrame(followFrame)
    }

    const startFollowing = () => {
      cancelAnimationFrame(frameRequestId)
      frameRequestId = requestAnimationFrame(followFrame)
    }

    const stopFollowing = () => {
      cancelAnimationFrame(frameRequestId)
      writeProgress()
    }

    writeProgress()

    if (!video.paused) {
      startFollowing()
    }

    const listeners = new AbortController()
    const { signal } = listeners

    video.addEventListener('play', startFollowing, { signal })
    video.addEventListener('pause', stopFollowing, { signal })
    video.addEventListener('seeking', writeProgress, { signal })
    video.addEventListener('durationchange', writeProgress, { signal })
    video.addEventListener('emptied', writeProgress, { signal })

    return () => {
      listeners.abort()
      cancelAnimationFrame(frameRequestId)
    }
  }, [video])

  return { indicatorRef, thumbRef }
}

type ScrubberProps = {
  video: HTMLVideoElement | null
}

const Scrubber = ({ video }: ScrubberProps) => {
  const dispatch = useMediaDispatch()
  const { currentTime, duration, hasDuration } = useMediaTimes()
  const { indicatorRef, thumbRef } = useFollowPlaybackProgress(video)
  const buffered = useMediaSelector((state) => {
    return state.mediaBuffered
  })
  const bufferedPercent = hasDuration
    ? (getBufferedEnd(buffered) / duration) * PERCENT_SCALE
    : 0

  const handleValueChange = (value: number | number[]) => {
    dispatch({
      type: MediaActionTypes.MEDIA_SEEK_REQUEST,
      detail: Array.isArray(value) ? value[0] : value
    })
  }

  return (
    <Slider.Root
      value={hasDuration ? Math.min(currentTime, duration) : 0}
      min={0}
      max={hasDuration ? duration : 1}
      step={SCRUBBER_STEP_SECONDS}
      disabled={!hasDuration}
      thumbAlignment="edge"
      onValueChange={handleValueChange}
    >
      <Slider.Control className="meme-scrubber-control">
        <Slider.Track className="meme-scrubber-track">
          <span
            aria-hidden="true"
            className="meme-scrubber-buffered"
            style={{ width: `${bufferedPercent}%` }}
          />
          <span aria-hidden="true" className="meme-scrubber-fill">
            <span ref={indicatorRef} className="meme-scrubber-indicator" />
          </span>
          <Slider.Thumb
            ref={thumbRef}
            className="meme-scrubber-thumb"
            aria-label={m.meme_video_position()}
            getAriaValueText={(_formattedValue, value) => {
              return m.meme_video_time({
                current: formatTime(value),
                total: formatTime(duration)
              })
            }}
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}

const TimeDisplay = () => {
  const { currentTime, duration, hasDuration } = useMediaTimes()

  if (!hasDuration) {
    return null
  }

  return (
    <span className="meme-player-time" aria-hidden="true">
      {formatTime(currentTime)}
      <span className="meme-player-time-total">
        {` / ${formatTime(duration)}`}
      </span>
    </span>
  )
}

const FullscreenButton = () => {
  const dispatch = useMediaDispatch()
  const isFullscreen =
    useMediaSelector((state) => {
      return state.mediaIsFullscreen
    }) ?? false

  const handleToggleFullscreen = () => {
    dispatch({
      type: isFullscreen
        ? MediaActionTypes.MEDIA_EXIT_FULLSCREEN_REQUEST
        : MediaActionTypes.MEDIA_ENTER_FULLSCREEN_REQUEST
    })
  }

  return (
    <PlayerButton
      label={isFullscreen ? m.meme_exit_fullscreen() : m.meme_fullscreen()}
      onClick={handleToggleFullscreen}
    >
      {isFullscreen ? <Minimize /> : <Maximize />}
    </PlayerButton>
  )
}

type PlayButtonProps = {
  className?: string
}

const PlayButton = ({ className }: PlayButtonProps) => {
  const { isPaused, togglePlay } = usePlayback()

  return (
    <PlayerButton
      label={isPaused ? m.meme_play_video() : m.meme_pause_video()}
      className={className}
      onClick={togglePlay}
    >
      {isPaused ? (
        <Play className="fill-current" />
      ) : (
        <Pause className="fill-current" />
      )}
    </PlayerButton>
  )
}

const MuteButton = () => {
  const dispatch = useMediaDispatch()
  const isMuted =
    useMediaSelector((state) => {
      return state.mediaMuted
    }) ?? false

  const handleToggleMute = () => {
    dispatch({
      type: isMuted
        ? MediaActionTypes.MEDIA_UNMUTE_REQUEST
        : MediaActionTypes.MEDIA_MUTE_REQUEST
    })
  }

  return (
    <PlayerButton
      label={isMuted ? m.meme_unmute() : m.meme_mute()}
      isPressed={isMuted}
      onClick={handleToggleMute}
    >
      {isMuted ? <VolumeX /> : <Volume2 />}
    </PlayerButton>
  )
}

const CenterPlayButton = () => {
  const { isPaused, togglePlay } = usePlayback()

  return (
    <button
      type="button"
      className="meme-player-center"
      aria-label={isPaused ? m.meme_play_video() : m.meme_pause_video()}
      onClick={togglePlay}
    >
      {isPaused ? (
        <Play aria-hidden="true" className="meme-player-center-play" />
      ) : (
        <Pause aria-hidden="true" />
      )}
    </button>
  )
}

type PlayerControlsProps = {
  video: HTMLVideoElement | null
  hasFullscreen: boolean
}

const PlayerControls = ({ video, hasFullscreen }: PlayerControlsProps) => {
  const { isPaused } = usePlayback()
  const { controlsRef, isShown } = useControlsVisibility({
    video,
    isPaused
  })

  return (
    <div
      ref={controlsRef}
      className="meme-player-controls"
      data-shown={isShown || undefined}
    >
      <CenterPlayButton />
      <div className="meme-player-chrome">
        <Scrubber video={video} />
        <div className="meme-player-bar">
          <PlayButton className="meme-player-bar-play" />
          <MuteButton />
          <TimeDisplay />
          <span className="flex-1" />
          {hasFullscreen ? <FullscreenButton /> : null}
        </div>
      </div>
    </div>
  )
}

type TapToPlayProps = {
  video: HTMLVideoElement | null
  isAwaitingAutoplay: boolean
}

const TapToPlay = ({ video, isAwaitingAutoplay }: TapToPlayProps) => {
  const { isPaused, togglePlay } = usePlayback()
  const handleTap = React.useEffectEvent(togglePlay)

  React.useEffect(() => {
    if (!video) {
      return () => {}
    }

    return listenToVideoTaps(video, handleTap)
  }, [video])

  if (!isPaused || isAwaitingAutoplay) {
    return null
  }

  return (
    <span aria-hidden="true" className="meme-player-paused">
      <Play />
    </span>
  )
}

type MemePlayerTransportProps = {
  video: HTMLVideoElement | null
  className?: string
}

export const MemePlayerTransport = ({
  video,
  className
}: MemePlayerTransportProps) => {
  return (
    <div className={cn('meme-player-transport dark', className)}>
      <ClientOnly>
        <PlayButton />
        <MuteButton />
        <div className="meme-player-transport-scrubber">
          <Scrubber video={video} />
        </div>
        <TimeDisplay />
      </ClientOnly>
    </div>
  )
}

type LoadingIndicatorProps = {
  isAwaitingAutoplay: boolean
}

const LoadingIndicator = ({ isAwaitingAutoplay }: LoadingIndicatorProps) => {
  const isBuffering = useMediaSelector((state) => {
    return state.mediaPaused === false && state.mediaLoading === true
  })
  const isSpinnerVisible = useSpinDelay(
    isAwaitingAutoplay || isBuffering,
    LOADING_SPINNER_DELAY
  )

  if (!isSpinnerVisible) {
    return null
  }

  return (
    <output className="meme-player-loading">
      <LoaderCircle aria-hidden="true" />
      <span className="sr-only">{m.common_loading()}</span>
    </output>
  )
}

type MemePlayerProps = {
  bunnyId: string
  title: string
  onVideoChange: (video: HTMLVideoElement | null) => void
  playbackFailure?: PlaybackFailure | null
  autoPlay?: boolean
  muted?: boolean
  preload?: VideoPreload
  hasFullscreen?: boolean
  hasControls?: boolean
  className?: string
  children?: React.ReactNode
}

export const MemePlayer = ({
  bunnyId,
  title,
  onVideoChange,
  playbackFailure = null,
  autoPlay = false,
  muted = false,
  preload = 'auto',
  hasFullscreen = true,
  hasControls = true,
  className,
  children
}: MemePlayerProps) => {
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null)
  const [startedBunnyId, setStartedBunnyId] = React.useState<string | null>(
    null
  )
  const [blockedBunnyId, setBlockedBunnyId] = React.useState<string | null>(
    null
  )
  const [loadStartedBunnyId, setLoadStartedBunnyId] = React.useState<
    string | null
  >(null)
  const hasStarted = startedBunnyId === bunnyId
  const hasLoadStarted = loadStartedBunnyId === bunnyId
  const isAwaitingAutoplay =
    autoPlay && !hasStarted && blockedBunnyId !== bunnyId

  const handleVideoChange = React.useCallback(
    (nextVideo: HTMLVideoElement | null) => {
      setVideo(nextVideo)
      onVideoChange(nextVideo)
    },
    [onVideoChange]
  )

  return (
    <VideoPlayer
      data-testid="meme-video-player"
      data-started={hasStarted || undefined}
      data-awaiting-autoplay={isAwaitingAutoplay || undefined}
      hotkeys={hasFullscreen ? undefined : 'nof'}
      className={cn('meme-player dark', className)}
    >
      <link rel="stylesheet" href={memePlayerCss} precedence="default" />
      <MemeVideoElement
        title={title}
        autoPlay={autoPlay}
        muted={muted}
        preload={preload}
        onVideoChange={handleVideoChange}
        onLoadStart={() => {
          setLoadStartedBunnyId(bunnyId)
        }}
        onStart={() => {
          setStartedBunnyId(bunnyId)
        }}
        onAutoplayBlocked={() => {
          setBlockedBunnyId(bunnyId)
        }}
      />
      <img
        data-testid="meme-poster"
        src={buildVideoFirstFrameUrl(bunnyId)}
        alt=""
        fetchPriority="high"
        decoding="async"
        className="meme-player-poster"
      />
      {children}
      <ClientOnly>
        <LoadingIndicator
          isAwaitingAutoplay={isAwaitingAutoplay && hasLoadStarted}
        />
        {hasControls ? (
          <PlayerControls video={video} hasFullscreen={hasFullscreen} />
        ) : (
          <TapToPlay video={video} isAwaitingAutoplay={isAwaitingAutoplay} />
        )}
      </ClientOnly>
      {playbackFailure ? (
        <VideoPlaybackError onRetry={playbackFailure.handleRetry} />
      ) : null}
    </VideoPlayer>
  )
}

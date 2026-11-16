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
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

const SCRUBBER_STEP_SECONDS = 0.01

const LOADING_SPINNER_DELAY = { delay: 700, minDuration: 300 }

type PlaybackFailure = {
  handleRetry: () => void
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

type MemeVideoElementProps = {
  title: string
  onVideoChange: (video: HTMLVideoElement | null) => void
  onStart: () => void
}

const MemeVideoElement = ({
  title,
  onVideoChange,
  onStart
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
    void playOrReportBlocked(event.currentTarget, onStart)
  }

  return (
    <video
      slot="media"
      data-testid="meme-video"
      aria-label={title}
      ref={videoRef}
      tabIndex={-1}
      crossOrigin=""
      className="size-full"
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      preload="auto"
      autoPlay
      loop
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
}

const PlayerButton = ({
  label,
  onClick,
  isPressed,
  children
}: PlayerButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="meme-player-button"
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

const PLAYBACK_PROGRESS_PROPERTY = '--meme-scrubber-progress'

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

type PlayerControlsProps = {
  video: HTMLVideoElement | null
}

const PlayerControls = ({ video }: PlayerControlsProps) => {
  const dispatch = useMediaDispatch()
  const isPaused =
    useMediaSelector((state) => {
      return state.mediaPaused
    }) ?? true
  const isMuted =
    useMediaSelector((state) => {
      return state.mediaMuted
    }) ?? false
  const isFullscreen =
    useMediaSelector((state) => {
      return state.mediaIsFullscreen
    }) ?? false

  const handleTogglePlay = () => {
    dispatch({
      type: isPaused
        ? MediaActionTypes.MEDIA_PLAY_REQUEST
        : MediaActionTypes.MEDIA_PAUSE_REQUEST
    })
  }

  const handleToggleMute = () => {
    dispatch({
      type: isMuted
        ? MediaActionTypes.MEDIA_UNMUTE_REQUEST
        : MediaActionTypes.MEDIA_MUTE_REQUEST
    })
  }

  const handleToggleFullscreen = () => {
    dispatch({
      type: isFullscreen
        ? MediaActionTypes.MEDIA_EXIT_FULLSCREEN_REQUEST
        : MediaActionTypes.MEDIA_ENTER_FULLSCREEN_REQUEST
    })
  }

  return (
    <div className="meme-player-chrome">
      <Scrubber video={video} />
      <div className="flex items-center gap-1">
        <PlayerButton
          label={isPaused ? m.meme_play_video() : m.meme_pause_video()}
          onClick={handleTogglePlay}
        >
          {isPaused ? (
            <Play className="fill-current" />
          ) : (
            <Pause className="fill-current" />
          )}
        </PlayerButton>
        <PlayerButton
          label={isMuted ? m.meme_unmute() : m.meme_mute()}
          isPressed={isMuted}
          onClick={handleToggleMute}
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </PlayerButton>
        <TimeDisplay />
        <span className="flex-1" />
        <PlayerButton
          label={isFullscreen ? m.meme_exit_fullscreen() : m.meme_fullscreen()}
          onClick={handleToggleFullscreen}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </PlayerButton>
      </div>
    </div>
  )
}

const PausedIndicator = () => {
  const isPaused = useMediaSelector((state) => {
    return state.mediaPaused
  })

  if (!isPaused) {
    return null
  }

  return (
    <span aria-hidden="true" className="meme-player-paused">
      <Play />
    </span>
  )
}

type LoadingIndicatorProps = {
  isStarting: boolean
}

const LoadingIndicator = ({ isStarting }: LoadingIndicatorProps) => {
  const isBuffering = useMediaSelector((state) => {
    return state.mediaPaused === false && state.mediaLoading === true
  })
  const isSpinnerVisible = useSpinDelay(
    isStarting || isBuffering,
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

type MemeWatchPlayerProps = {
  bunnyId: string
  title: string
  video: HTMLVideoElement | null
  onVideoChange: (video: HTMLVideoElement | null) => void
  playbackFailure: PlaybackFailure | null
}

export const MemeWatchPlayer = ({
  bunnyId,
  title,
  video,
  onVideoChange,
  playbackFailure
}: MemeWatchPlayerProps) => {
  const [startedBunnyId, setStartedBunnyId] = React.useState<string | null>(
    null
  )
  const isStarting = startedBunnyId !== bunnyId

  const handleStart = () => {
    setStartedBunnyId(bunnyId)
  }

  return (
    <VideoPlayer
      data-testid="meme-video-player"
      data-starting={isStarting ? '' : undefined}
      className="meme-player dark absolute inset-0 size-full"
    >
      <MemeVideoElement
        title={title}
        onVideoChange={onVideoChange}
        onStart={handleStart}
      />
      <img
        data-testid="meme-poster"
        src={buildVideoFirstFrameUrl(bunnyId)}
        alt=""
        fetchPriority="high"
        decoding="async"
        className="meme-player-poster"
      />
      <ClientOnly>
        {isStarting ? null : <PausedIndicator />}
        <LoadingIndicator isStarting={isStarting} />
        <PlayerControls video={video} />
      </ClientOnly>
      {playbackFailure ? (
        <VideoPlaybackError onRetry={playbackFailure.handleRetry} />
      ) : null}
    </VideoPlayer>
  )
}

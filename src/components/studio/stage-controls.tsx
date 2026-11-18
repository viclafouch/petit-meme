import React from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Slider } from '@base-ui/react/slider'
import { formatClockDuration } from '~/helpers/duration'
import { seekVideoOnceReady } from '~/lib/video'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

const CONTROLS_IDLE_MS = 2200
const SCRUBBER_STEP_SECONDS = 0.05
const VIDEO_STATE_EVENTS = [
  'play',
  'pause',
  'volumechange',
  'timeupdate',
  'durationchange',
  'seeked'
] as const

const formatTime = (seconds: number) => {
  return formatClockDuration(Math.max(0, Math.floor(seconds)), getLocale())
}

const readVideoState = (video: HTMLVideoElement) => {
  return {
    isPaused: video.paused,
    isMuted: video.muted,
    currentTime: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : 0
  }
}

const INITIAL_VIDEO_STATE = {
  isPaused: false,
  isMuted: true,
  currentTime: 0,
  duration: 0
}

const useVideoState = (video: HTMLVideoElement | null) => {
  const [state, setState] = React.useState(INITIAL_VIDEO_STATE)

  React.useEffect(() => {
    if (video === null) {
      return () => {}
    }

    const listeners = new AbortController()

    const sync = () => {
      setState(readVideoState(video))
    }

    for (const type of VIDEO_STATE_EVENTS) {
      video.addEventListener(type, sync, { signal: listeners.signal })
    }

    sync()

    return () => {
      listeners.abort()
    }
  }, [video])

  return state
}

const useFollowProgress = (video: HTMLVideoElement | null) => {
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (video === null) {
      return () => {}
    }

    let frame = 0
    const listeners = new AbortController()

    const write = () => {
      const progress =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.currentTime / video.duration
          : 0
      rootRef.current?.style.setProperty(
        '--meme-scrubber-progress',
        String(progress)
      )
    }

    const follow = () => {
      cancelAnimationFrame(frame)
      write()
      frame = requestAnimationFrame(follow)
    }

    const stop = () => {
      cancelAnimationFrame(frame)
      write()
    }

    video.addEventListener('playing', follow, { signal: listeners.signal })

    for (const type of ['pause', 'seeked', 'durationchange']) {
      video.addEventListener(type, stop, { signal: listeners.signal })
    }

    if (video.paused) {
      write()
    } else {
      follow()
    }

    return () => {
      cancelAnimationFrame(frame)
      listeners.abort()
    }
  }, [video])

  return rootRef
}

const playQuietly = (video: HTMLVideoElement) => {
  void Promise.allSettled([video.play()])
}

const toggleVideoMuted = (video: HTMLVideoElement) => {
  video.muted = !video.muted
}

type StageControlsProps = {
  video: HTMLVideoElement | null
}

export const StageControls = ({ video }: StageControlsProps) => {
  const { isPaused, isMuted, currentTime, duration } = useVideoState(video)
  const rootRef = useFollowProgress(video)
  const [isAwake, setIsAwake] = React.useState(false)
  const idleTimerRef = React.useRef(0)
  const playLabel = isPaused ? m.meme_play_video() : m.meme_pause_video()

  const wake = () => {
    setIsAwake(true)
    window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => {
      setIsAwake(false)
    }, CONTROLS_IDLE_MS)
  }

  React.useEffect(() => {
    return () => {
      window.clearTimeout(idleTimerRef.current)
    }
  }, [])

  const togglePlay = () => {
    if (video === null) {
      return
    }

    wake()

    if (video.paused) {
      playQuietly(video)
    } else {
      video.pause()
    }
  }

  const toggleMute = () => {
    if (video === null) {
      return
    }

    wake()
    toggleVideoMuted(video)

    if (!video.muted && video.paused) {
      playQuietly(video)
    }
  }

  return (
    <div
      ref={rootRef}
      className="studio-stage-controls"
      data-awake={isAwake || isPaused || undefined}
      onPointerMove={wake}
    >
      <button
        type="button"
        className="studio-stage-tap"
        aria-label={playLabel}
        tabIndex={-1}
        onClick={togglePlay}
      />
      {isPaused ? (
        <span aria-hidden="true" className="studio-stage-paused">
          <Play />
        </span>
      ) : null}
      <div className="studio-stage-bar" onFocus={wake}>
        <button
          type="button"
          className="studio-stage-button"
          aria-label={playLabel}
          onClick={togglePlay}
        >
          {isPaused ? (
            <Play aria-hidden="true" />
          ) : (
            <Pause aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="studio-stage-button"
          aria-label={isMuted ? m.meme_unmute() : m.meme_mute()}
          aria-pressed={!isMuted}
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX aria-hidden="true" />
          ) : (
            <Volume2 aria-hidden="true" />
          )}
        </button>
        <Slider.Root
          className="studio-stage-scrubber"
          value={duration > 0 ? Math.min(currentTime, duration) : 0}
          min={0}
          max={duration > 0 ? duration : 1}
          step={SCRUBBER_STEP_SECONDS}
          disabled={duration === 0}
          thumbAlignment="edge"
          onValueChange={(value: number | number[]) => {
            if (video !== null) {
              wake()
              seekVideoOnceReady(
                video,
                Array.isArray(value) ? (value[0] ?? 0) : value
              )
            }
          }}
        >
          <Slider.Control className="meme-scrubber-control">
            <Slider.Track className="meme-scrubber-track">
              <span aria-hidden="true" className="meme-scrubber-fill">
                <span className="meme-scrubber-indicator" />
              </span>
              <Slider.Thumb
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
        <span className="studio-stage-time" aria-hidden="true">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

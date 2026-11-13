import React from 'react'
import { Download, Play, Share2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { MemeExportMenu } from '~/components/meme/meme-export-menu'
import { ToggleBookmarkButton } from '~/components/meme/toggle-bookmark-button'
import { useMemeExport } from '~/components/meme/use-meme-export'
import { type SignedStream, useMemeHls } from '~/components/meme/use-meme-hls'
import { useRegisterMemeView } from '~/components/meme/use-register-meme-view'
import { VideoPlaybackError } from '~/components/meme/video-playback-error'
import { LoadingSpinner } from '~/components/ui/spinner'
import type { MemeWithVideo } from '~/constants/meme'
import { cn } from '~/lib/utils'
import {
  matchIsVideoBuffered,
  seekVideoOnceReady,
  setVideoBuffering,
  stopVideo,
  type VideoBuffering
} from '~/lib/video'
import { m } from '~/paraglide/messages'
import {
  takeReelResumeTime,
  takeReelSnapshot
} from '~/routes/reels/-lib/reel-snapshot'
import {
  muteVideo,
  playReel,
  type ReelsSound
} from '~/routes/reels/-lib/reels-playback'
import { useVideoState } from '~/routes/reels/-lib/use-video-state'
import { ReelProgress } from './reel-progress'

export type ReelLoading = VideoBuffering | 'poster'

const RAIL_ITEM_CLASS_NAME =
  'grid size-12 place-items-center rounded-full text-white touch-tap transition-transform duration-100 ease-out active:scale-90 [&>svg]:size-7 [&>svg]:drop-shadow-md'

const RAIL_BUTTON_CLASS_NAME =
  'size-12 rounded-full touch-tap transition-transform duration-100 ease-out active:scale-90 [&>svg]:size-7! [&>svg]:drop-shadow-md'

type ReelProps = {
  index: number
  meme: MemeWithVideo
  signedStream: SignedStream
  loading: ReelLoading
  sound: ReelsSound
  onSoundChange: (sound: ReelsSound) => void
  onBuffered: (index: number) => void
  isOnScreen: boolean
}

export const Reel = ({
  index,
  meme,
  signedStream,
  loading,
  sound,
  onSoundChange,
  onBuffered,
  isOnScreen
}: ReelProps) => {
  const isActive = loading === 'play'
  const [isPausedByUser, setIsPausedByUser] = React.useState(false)
  const isActiveRef = React.useRef(isActive)
  const { video, videoCallbackRef, playbackFailure } = useMemeHls({
    memeId: meme.id,
    signedStream,
    isEnabled: loading !== 'poster'
  })
  const videoState = useVideoState(video)
  const shareMutation = useMemeExport({ mode: 'share' })
  const downloadMutation = useMemeExport({ mode: 'download' })
  const shouldPlay = isActive && isOnScreen && !isPausedByUser
  const isWaiting = shouldPlay && videoState !== 'playing'

  if (!isActive && isPausedByUser) {
    setIsPausedByUser(false)
  }

  useRegisterMemeView({ memeId: meme.id, video, enabled: isActive })

  React.useLayoutEffect(() => {
    if (video) {
      setVideoBuffering(video, loading === 'poster' ? 'preload' : loading)
    }
  }, [video, loading])

  React.useEffect(() => {
    if (video) {
      muteVideo(video, sound !== 'on')
    }
  }, [video, sound])

  React.useEffect(() => {
    if (!video) {
      return () => {}
    }

    const fitVideoBoxToPicture = () => {
      if (video.videoHeight > 0) {
        video.style.setProperty(
          '--video-ratio',
          String(video.videoWidth / video.videoHeight)
        )
      }
    }

    video.addEventListener('resize', fitVideoBoxToPicture)

    return () => {
      video.removeEventListener('resize', fitVideoBoxToPicture)
    }
  }, [video])

  React.useEffect(() => {
    if (!video) {
      return () => {}
    }

    if (!isActive) {
      stopVideo(video)

      return () => {}
    }

    if (!shouldPlay) {
      video.pause()

      return () => {}
    }

    const resumeTime = takeReelResumeTime(meme.id)

    if (resumeTime !== null) {
      seekVideoOnceReady(video, resumeTime)
    }

    const abortController = new AbortController()

    void playReel({
      video,
      signal: abortController.signal,
      onSoundBlocked: () => {
        onSoundChange('blocked')
      },
      onRefused: () => {
        setIsPausedByUser(true)
      }
    })

    return () => {
      abortController.abort()
    }
  }, [video, isActive, shouldPlay, onSoundChange, meme.id])

  React.useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  React.useLayoutEffect(() => {
    if (!video) {
      return () => {}
    }

    return () => {
      if (isActiveRef.current) {
        takeReelSnapshot(meme.id, video)
      }
    }
  }, [video, meme.id])

  React.useEffect(() => {
    if (!video || !isActive || videoState !== 'playing') {
      return () => {}
    }

    const reportWhenBuffered = () => {
      if (matchIsVideoBuffered(video)) {
        onBuffered(index)
      }
    }

    const abortController = new AbortController()

    reportWhenBuffered()

    for (const eventName of ['progress', 'timeupdate'] as const) {
      video.addEventListener(eventName, reportWhenBuffered, {
        signal: abortController.signal
      })
    }

    return () => {
      abortController.abort()
    }
  }, [video, isActive, videoState, index, onBuffered])

  const pauseLabel = isPausedByUser ? m.meme_play_video() : m.meme_pause_video()
  const tapLabel = sound === 'blocked' ? m.meme_unmute() : pauseLabel

  const handleTap = () => {
    if (sound === 'blocked') {
      if (video) {
        muteVideo(video, false)
      }

      onSoundChange('on')

      return
    }

    setIsPausedByUser((wasPausedByUser) => {
      return !wasPausedByUser
    })
  }

  return (
    <article
      data-index={index}
      aria-label={meme.title}
      aria-posinset={index + 1}
      aria-setsize={-1}
      className="absolute inset-0"
    >
      <video
        ref={videoCallbackRef}
        aria-hidden="true"
        tabIndex={-1}
        className="reel-video"
        preload="none"
        crossOrigin=""
        playsInline
        loop
        disablePictureInPicture
        disableRemotePlayback
      />
      <button
        type="button"
        aria-label={tapLabel}
        tabIndex={isActive ? 0 : -1}
        className="absolute inset-0 size-full touch-tap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={handleTap}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        {isPausedByUser ? (
          <Play className="size-16 fill-white/90 text-white/90 drop-shadow-lg animate-in fade-in zoom-in-75 duration-150" />
        ) : (
          <LoadingSpinner
            className={cn(
              'size-10 text-white/80 transition-opacity',
              isWaiting
                ? 'opacity-100 delay-500 duration-200'
                : 'opacity-0 duration-0'
            )}
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end gap-3 bg-linear-to-t from-black/70 via-black/25 to-transparent pt-24 pr-2 pb-4 pl-4">
        <Link
          to="/memes/$memeId"
          params={{ memeId: meme.id }}
          className="pointer-events-auto mb-2 min-w-0 flex-1 rounded-sm font-bricolage text-lg leading-heading font-semibold text-balance text-white line-clamp-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {meme.title}
        </Link>
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <ToggleBookmarkButton
            meme={meme}
            className={RAIL_BUTTON_CLASS_NAME}
          />
          <MemeExportMenu
            mode="share"
            memeTitle={meme.title}
            align="end"
            onExport={(format) => {
              shareMutation.trigger(meme, format)
            }}
            render={
              <button
                type="button"
                aria-label={m.meme_share()}
                className={RAIL_ITEM_CLASS_NAME}
              />
            }
          >
            <Share2 aria-hidden="true" />
          </MemeExportMenu>
          <MemeExportMenu
            mode="download"
            memeTitle={meme.title}
            align="end"
            onExport={(format) => {
              downloadMutation.trigger(meme, format)
            }}
            render={
              <button
                type="button"
                aria-label={m.meme_download()}
                className={RAIL_ITEM_CLASS_NAME}
              />
            }
          >
            <Download aria-hidden="true" />
          </MemeExportMenu>
        </div>
      </div>
      {isActive ? <ReelProgress video={video} /> : null}
      {playbackFailure ? (
        <VideoPlaybackError onRetry={playbackFailure.handleRetry} />
      ) : null}
    </article>
  )
}

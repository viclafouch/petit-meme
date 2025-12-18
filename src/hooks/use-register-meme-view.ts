import * as React from 'react'
import type { Meme } from '@/db/generated/prisma/client'
import { registerMemeView } from '@/server/meme'

type UseRegisterMemeViewParams = {
  memeId: Meme['id']
  videoRef: React.RefObject<HTMLVideoElement | null>
  enabled?: boolean
  ratio?: number
  minMs?: number
  maxMs?: number
}

const matchIsEligible = (video: HTMLVideoElement) => {
  const isDocVisible = document.visibilityState === 'visible'
  const isPlaying = !video.paused && !video.ended

  return isDocVisible && isPlaying
}

const getTresholdMs = (
  video: HTMLVideoElement,
  ratio: number,
  minMs: number,
  maxMs: number
) => {
  const duration = Number.isFinite(video.duration) ? video.duration : 0
  const ratioMs = duration > 0 ? duration * 1000 * ratio : 0
  const raw = Math.max(minMs, ratioMs)

  return Math.min(maxMs, raw)
}

export function useRegisterMemeView({
  memeId,
  videoRef,
  enabled = true,
  ratio = 0.3,
  minMs = 2500,
  maxMs = 12000
}: UseRegisterMemeViewParams) {
  const sentRef = React.useRef(false)
  const watchMsRef = React.useRef(0)
  const lastTRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    sentRef.current = false
    watchMsRef.current = 0
    lastTRef.current = null
  }, [memeId])

  React.useEffect(() => {
    const video = videoRef.current

    if (!enabled || !video) {
      return () => {}
    }

    const maybeSend = async () => {
      if (Boolean(sentRef.current)) {
        return
      }

      const needed = getTresholdMs(video, ratio, minMs, maxMs)

      if (watchMsRef.current < needed) {
        return
      }

      sentRef.current = true

      try {
        await registerMemeView({
          data: {
            memeId,
            watchMs: Math.round(watchMsRef.current)
          }
        })
      } catch {
        // option: sentRef.current = false; // si tu veux retenter
      }
    }

    const onPlay = () => {
      lastTRef.current = video.currentTime
    }

    const onPauseOrEnded = () => {
      lastTRef.current = null
    }

    const onSeeking = () => {
      lastTRef.current = video.currentTime
    }

    const onTimeUpdate = () => {
      if (!matchIsEligible(video)) {
        lastTRef.current = video.currentTime

        return () => {}
      }

      const prev = lastTRef.current
      const cur = video.currentTime
      lastTRef.current = cur

      if (prev === null) {
        return () => {}
      }

      const delta = cur - prev

      if (delta <= 0) {
        return () => {}
      }

      if (delta > 1.1) {
        return () => {}
      }

      watchMsRef.current += delta * 1000

      void maybeSend()

      return () => {}
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        lastTRef.current = null
      } else {
        lastTRef.current = video.currentTime
      }
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPauseOrEnded)
    video.addEventListener('ended', onPauseOrEnded)
    video.addEventListener('seeking', onSeeking)
    video.addEventListener('timeupdate', onTimeUpdate)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPauseOrEnded)
      video.removeEventListener('ended', onPauseOrEnded)
      video.removeEventListener('seeking', onSeeking)
      video.removeEventListener('timeupdate', onTimeUpdate)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, memeId, maxMs, minMs, ratio, videoRef])
}

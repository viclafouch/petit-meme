import { z } from 'zod'

export type ReelsSound = 'on' | 'muted' | 'blocked'

const NETWORK_INFORMATION_SCHEMA = z.object({
  saveData: z.boolean().optional(),
  effectiveType: z.string().optional()
})

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g'])

export const matchIsDataSaverOn = () => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false
  }

  const { data } = NETWORK_INFORMATION_SCHEMA.safeParse(navigator.connection)

  return (
    data?.saveData === true ||
    SLOW_EFFECTIVE_TYPES.has(data?.effectiveType ?? '')
  )
}

type PlayReelParams = {
  video: HTMLVideoElement
  signal: AbortSignal
  onSoundBlocked: () => void
  onRefused: () => void
}

const matchIsAutoplayRefusal = (error: unknown) => {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

export const playReel = async ({
  video,
  signal,
  onSoundBlocked,
  onRefused
}: PlayReelParams): Promise<void> => {
  try {
    await video.play()

    return
  } catch (error) {
    if (signal.aborted) {
      return
    }

    if (matchIsAutoplayRefusal(error)) {
      if (video.muted) {
        onRefused()

        return
      }

      video.muted = true
      onSoundBlocked()

      return playReel({ video, signal, onSoundBlocked, onRefused })
    }
  }

  video.addEventListener(
    'canplay',
    () => {
      void playReel({ video, signal, onSoundBlocked, onRefused })
    },
    { once: true, signal }
  )
}

export const muteVideo = (video: HTMLVideoElement, isMuted: boolean) => {
  video.muted = isMuted
}

export type ReelsSound = 'on' | 'muted' | 'blocked'

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

import React from 'react'
import { SITE_NAME } from '~/constants/branding'
import type { MemeWithVideo } from '~/constants/meme'
import { buildVideoImageUrl } from '~/lib/bunny-public-urls'

type UseMediaSessionParams = {
  video: HTMLVideoElement | null
  isActive: boolean
  meme: Pick<MemeWithVideo, 'title' | 'video'>
  onNextTrack?: () => void
  onPreviousTrack?: () => void
}

const setActionHandler = (
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
) => {
  try {
    navigator.mediaSession.setActionHandler(action, handler)

    return true
  } catch {
    return false
  }
}

export const useMediaSession = ({
  video,
  isActive,
  meme,
  onNextTrack,
  onPreviousTrack
}: UseMediaSessionParams) => {
  const goToNextTrack = React.useEffectEvent(() => {
    onNextTrack?.()
  })
  const goToPreviousTrack = React.useEffectEvent(() => {
    onPreviousTrack?.()
  })
  const hasTrackNavigation = Boolean(onNextTrack ?? onPreviousTrack)
  const { title } = meme
  const artworkUrl = buildVideoImageUrl(meme.video.bunnyId)

  React.useEffect(() => {
    if (!video || !isActive || !('mediaSession' in navigator)) {
      return () => {}
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: SITE_NAME,
      artwork: [{ src: artworkUrl, type: 'image/jpeg' }]
    })
    setActionHandler('play', () => {
      void video.play()
    })
    setActionHandler('pause', () => {
      video.pause()
    })

    if (hasTrackNavigation) {
      setActionHandler('nexttrack', goToNextTrack)
      setActionHandler('previoustrack', goToPreviousTrack)
    }

    return () => {
      navigator.mediaSession.metadata = null

      for (const action of [
        'play',
        'pause',
        'nexttrack',
        'previoustrack'
      ] as const) {
        setActionHandler(action, null)
      }
    }
  }, [video, isActive, title, artworkUrl, hasTrackNavigation])
}

import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useHydrated } from '@tanstack/react-router'
import { HOUR } from '~/constants/time'
import type { Meme } from '~/db/generated/prisma/client'
import { attachHlsSource } from '~/lib/video'
import { getMemePlaybackUrlQueryOpts } from '~/queries/meme'

const PLAYBACK_URL_REFRESH_AFTER_MS = HOUR

export type SignedStream = {
  url: string
  signedAt: number
}

type UseMemeHlsParams = {
  memeId: Meme['id']
  signedStream?: SignedStream
  isEnabled?: boolean
}

export const useMemeHls = ({
  memeId,
  signedStream,
  isEnabled = true
}: UseMemeHlsParams) => {
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null)
  const [failedStreamUrl, setFailedStreamUrl] = React.useState<string | null>(
    null
  )
  const queryClient = useQueryClient()
  const isHydrated = useHydrated()
  const playbackUrlQuery = useQuery({
    ...getMemePlaybackUrlQueryOpts(memeId),
    initialData: signedStream?.url,
    initialDataUpdatedAt: signedStream?.signedAt,
    enabled: isEnabled
  })
  const streamUrl = playbackUrlQuery.data ?? null
  const hasPlaybackFailed =
    (streamUrl !== null && failedStreamUrl === streamUrl) ||
    (isHydrated && playbackUrlQuery.isError)

  React.useEffect(() => {
    if (!isEnabled || !video || streamUrl === null || hasPlaybackFailed) {
      return () => {}
    }

    const playbackUrlQueryOpts = getMemePlaybackUrlQueryOpts(memeId)

    const detachHlsSource = attachHlsSource({
      video,
      videoSrc: streamUrl,
      onFatalError: () => {
        const { dataUpdatedAt = 0 } =
          queryClient.getQueryState(playbackUrlQueryOpts.queryKey) ?? {}

        if (Date.now() - dataUpdatedAt >= PLAYBACK_URL_REFRESH_AFTER_MS) {
          void queryClient.resetQueries(playbackUrlQueryOpts)

          return
        }

        setFailedStreamUrl(streamUrl)
      }
    })

    return () => {
      detachHlsSource()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [isEnabled, video, streamUrl, hasPlaybackFailed, memeId, queryClient])

  const handleRetryPlayback = () => {
    void queryClient.resetQueries(getMemePlaybackUrlQueryOpts(memeId))
  }

  const playbackFailure = hasPlaybackFailed
    ? { handleRetry: handleRetryPlayback }
    : null

  return { video, videoCallbackRef: setVideo, playbackFailure }
}

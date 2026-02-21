import { z } from 'zod'
import { clientEnv } from '@/env/client'
import { serverEnv } from '@/env/server'
import { bunnyLogger } from '@/lib/logger'
import { createServerOnlyFn } from '@tanstack/react-start'
import { fetchWithZod } from './utils'

export const buildBunnyUrl = (pathname: `/${string}`) => {
  return new URL(
    pathname,
    `https://${clientEnv.VITE_BUNNY_HOSTNAME}`
  ).toString()
}

export const getBunnyHeaders = createServerOnlyFn(() => {
  return new Headers({
    AccessKey: serverEnv.BUNNY_ACCESS_KEY,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  })
})

const DEFAULT_RESPONSE_SCHEMA = z.object({
  success: z.literal(true)
})

export const buildVideoImageUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/thumbnail.jpg`)
}

export const buildVideoOriginalUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/original`)
}

export const buildIframeVideoUrl = (videoId: string) => {
  return `https://iframe.mediadelivery.net/embed/${clientEnv.VITE_BUNNY_LIBRARY_ID}/${videoId}`
}

export const buildVideoPreviewUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/preview.webp`)
}

export const buildVideoStreamUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/playlist.m3u8`)
}

export const deleteVideo = createServerOnlyFn(async (videoId: string) => {
  const result = await fetchWithZod(
    DEFAULT_RESPONSE_SCHEMA,
    `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'DELETE',
      headers: getBunnyHeaders()
    }
  )

  bunnyLogger.info({ videoId }, 'Video deleted')

  return result
})

const VIDEO_PLAY_DATA_SCHEMA = z.object({
  video: z.object({
    length: z.number()
  })
})

export const getVideoPlayData = createServerOnlyFn(async (videoId: string) => {
  return fetchWithZod(
    VIDEO_PLAY_DATA_SCHEMA,
    `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}/play`,
    {
      method: 'GET',
      headers: getBunnyHeaders()
    }
  )
})

const UPLOAD_RESPONSE_SCHEMA = z.object({
  guid: z.string()
})

export const createVideo = createServerOnlyFn(async (title: string) => {
  const { guid: videoId } = await fetchWithZod(
    UPLOAD_RESPONSE_SCHEMA,
    `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos`,
    {
      method: 'POST',
      headers: getBunnyHeaders(),
      body: JSON.stringify({
        title,
        collectionId: serverEnv.BUNNY_COLLECTION_ID
      })
    }
  )

  bunnyLogger.info({ videoId }, 'Video created')

  return { videoId }
})

export const uploadVideo = createServerOnlyFn(
  async (videoId: string, videoBuffer: Buffer) => {
    const headers = getBunnyHeaders()
    headers.set('Content-Type', 'video/mp4')

    await fetchWithZod(
      DEFAULT_RESPONSE_SCHEMA,
      `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'PUT',
        headers,
        // @ts-expect-error: fetch body type doesn't accept Buffer but it works at runtime
        body: videoBuffer
      }
    )

    bunnyLogger.info(
      { videoId, sizeBytes: videoBuffer.length },
      'Video uploaded'
    )

    return {
      videoId
    }
  }
)

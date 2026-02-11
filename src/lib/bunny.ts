import { z } from 'zod'
import { ENV } from '@/constants/env'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { fetchWithZod } from './utils'

export const buildBunnyUrl = (pathname: `/${string}`) => {
  return new URL(pathname, `https://${ENV.VITE_BUNNY_HOSTNAME}`).toString()
}

export const getBunnyHeaders = createServerOnlyFn(() => {
  const headers = new Headers()
  headers.set('AccessKey', ENV.BUNNY_ACCESS_KEY)
  headers.set('accept', 'application/json')
  headers.set('Content-Type', 'application/json')

  return headers
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
  return `https://iframe.mediadelivery.net/embed/${ENV.VITE_BUNNY_LIBRARY_ID}/${videoId}`
}

export const buildVideoPreviewUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/preview.webp`)
}

export const buildVideoStreamUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/playlist.m3u8`)
}

export const deleteVideo = createServerOnlyFn(async (videoId: string) => {
  return fetchWithZod(
    DEFAULT_RESPONSE_SCHEMA,
    `https://video.bunnycdn.com/library/${ENV.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'DELETE',
      headers: getBunnyHeaders()
    }
  )
})

const VIDEO_PLAY_DATA_SCHEMA = z.object({
  video: z.object({
    length: z.number()
  })
})

export const getVideoPlayData = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z.string().parse(data)
  })
  .handler(async ({ data: videoId }) => {
    return fetchWithZod(
      VIDEO_PLAY_DATA_SCHEMA,
      `https://video.bunnycdn.com/library/${ENV.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}/play`,
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
    `https://video.bunnycdn.com/library/${ENV.VITE_BUNNY_LIBRARY_ID}/videos`,
    {
      method: 'POST',
      headers: getBunnyHeaders(),
      body: JSON.stringify({
        title,
        collectionId: ENV.BUNNY_COLLECTION_ID
      })
    }
  )

  return { videoId }
})

export const uploadVideo = createServerOnlyFn(
  async (videoId: string, videoBuffer: Buffer) => {
    const headers = getBunnyHeaders()
    headers.set('Content-Type', 'video/mp4')

    await fetchWithZod(
      DEFAULT_RESPONSE_SCHEMA,
      `https://video.bunnycdn.com/library/${ENV.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'PUT',
        headers,
        // @ts-expect-error: fetch body type doesn't accept Buffer but it works at runtime
        body: videoBuffer
      }
    )

    return {
      videoId
    }
  }
)

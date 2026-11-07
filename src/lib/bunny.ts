import { z } from 'zod'
import { createServerOnlyFn } from '@tanstack/react-start'
import {
  CRAWLER_STREAM_EXPIRES_AT,
  ORIGINAL_ACCESS_HEADER,
  PLAYBACK_TOKEN_TTL_SECONDS
} from '~/constants/bunny'
import { FIVE_MINUTES_IN_SECONDS, SECOND } from '~/constants/time'
import { clientEnv } from '~/env/client'
import { serverEnv } from '~/env/server'
import { signBunnyUrl } from '~/lib/bunny-token'
import { bunnyLogger } from '~/lib/logger'
import { fetchWithZod } from './utils'

const buildBunnyUrl = (pathname: `/${string}`) => {
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

export const buildVideoPreviewUrl = (videoId: string) => {
  return buildBunnyUrl(`/${videoId}/preview.webp`)
}

const getUnixTimeInSeconds = () => {
  return Math.floor(Date.now() / SECOND)
}

const signOriginalUrl = (videoId: string) => {
  return signBunnyUrl({
    url: buildBunnyUrl(`/${videoId}/original`),
    securityKey: serverEnv.BUNNY_TOKEN_AUTH_KEY,
    expiresAt: getUnixTimeInSeconds() + FIVE_MINUTES_IN_SECONDS
  })
}

export const fetchOriginalVideo = createServerOnlyFn(
  async (videoId: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    headers.set(ORIGINAL_ACCESS_HEADER, serverEnv.BUNNY_ORIGINAL_ACCESS_KEY)

    return fetch(await signOriginalUrl(videoId), { ...init, headers })
  }
)

const signVideoStreamUrl = (videoId: string, expiresAt: number) => {
  return signBunnyUrl({
    url: buildBunnyUrl(`/${videoId}/playlist.m3u8`),
    securityKey: serverEnv.BUNNY_TOKEN_AUTH_KEY,
    expiresAt,
    directoryPath: `/${videoId}/`
  })
}

export const buildSignedStreamUrl = createServerOnlyFn((videoId: string) => {
  return signVideoStreamUrl(
    videoId,
    getUnixTimeInSeconds() + PLAYBACK_TOKEN_TTL_SECONDS
  )
})

export const buildCrawlerStreamUrl = createServerOnlyFn((videoId: string) => {
  return signVideoStreamUrl(videoId, CRAWLER_STREAM_EXPIRES_AT)
})

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
  async (videoId: string, videoBuffer: Buffer<ArrayBuffer>) => {
    const headers = getBunnyHeaders()
    headers.set('Content-Type', 'video/mp4')

    await fetchWithZod(
      DEFAULT_RESPONSE_SCHEMA,
      `https://video.bunnycdn.com/library/${clientEnv.VITE_BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'PUT',
        headers,
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

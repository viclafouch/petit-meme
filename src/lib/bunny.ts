import { z } from 'zod'
import { FIVE_MINUTES_IN_SECONDS } from '@/constants/time'
import { clientEnv } from '@/env/client'
import { serverEnv } from '@/env/server'
import { signBunnyUrl } from '@/lib/bunny-token'
import { bunnyLogger } from '@/lib/logger'
import { createServerOnlyFn } from '@tanstack/react-start'
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

export const signOriginalUrl = (videoId: string) => {
  return signBunnyUrl({
    url: buildVideoOriginalUrl(videoId),
    securityKey: serverEnv.BUNNY_TOKEN_AUTH_KEY,
    expirationSeconds: FIVE_MINUTES_IN_SECONDS
  })
}

export const buildSignedOriginalUrl = createServerOnlyFn(signOriginalUrl)

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

const STORAGE_TIMEOUT_MS = 15_000
const STORAGE_UPLOAD_TIMEOUT_MS = 120_000

const withStorageTimeout = (timeoutMs = STORAGE_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    return controller.abort()
  }, timeoutMs)

  return {
    signal: controller.signal,
    clear: () => {
      return clearTimeout(timeoutId)
    }
  }
}

const buildStorageUrl = (bunnyId: string) => {
  return `https://${serverEnv.BUNNY_STORAGE_HOSTNAME}/${serverEnv.BUNNY_STORAGE_ZONE_NAME}/${bunnyId}.mp4`
}

const getStorageHeaders = () => {
  return new Headers({ AccessKey: serverEnv.BUNNY_STORAGE_API_KEY })
}

export const fetchWatermarkedVideo = createServerOnlyFn(
  async (bunnyId: string) => {
    const timeout = withStorageTimeout()

    try {
      const response = await fetch(buildStorageUrl(bunnyId), {
        headers: getStorageHeaders(),
        signal: timeout.signal
      })

      if (!response.ok) {
        throw new Error(
          `Bunny Storage responded with status ${response.status}`
        )
      }

      return response
    } finally {
      timeout.clear()
    }
  }
)

export const uploadWatermarkedVideo = createServerOnlyFn(
  async (bunnyId: string, videoBuffer: Buffer) => {
    const headers = getStorageHeaders()
    headers.set('Content-Type', 'application/octet-stream')
    const timeout = withStorageTimeout(STORAGE_UPLOAD_TIMEOUT_MS)

    try {
      const response = await fetch(buildStorageUrl(bunnyId), {
        method: 'PUT',
        headers,
        // @ts-expect-error -- fetch body type doesn't accept Buffer but it works at runtime
        body: videoBuffer,
        signal: timeout.signal
      })

      if (!response.ok) {
        throw new Error(
          `Bunny Storage upload failed with status ${response.status}`
        )
      }

      bunnyLogger.info(
        { bunnyId, sizeBytes: videoBuffer.length },
        'Watermarked video uploaded to Storage'
      )
    } finally {
      timeout.clear()
    }
  }
)

export const deleteWatermarkedVideo = createServerOnlyFn(
  async (bunnyId: string) => {
    const timeout = withStorageTimeout()

    try {
      const response = await fetch(buildStorageUrl(bunnyId), {
        method: 'DELETE',
        headers: getStorageHeaders(),
        signal: timeout.signal
      })

      if (!response.ok && response.status !== 404) {
        throw new Error(
          `Bunny Storage delete failed with status ${response.status}`
        )
      }

      bunnyLogger.info({ bunnyId }, 'Watermarked video deleted from Storage')
    } finally {
      timeout.clear()
    }
  }
)

export const checkWatermarkExists = createServerOnlyFn(
  async (bunnyId: string) => {
    const timeout = withStorageTimeout()

    try {
      const response = await fetch(buildStorageUrl(bunnyId), {
        method: 'HEAD',
        headers: getStorageHeaders(),
        signal: timeout.signal
      })

      return response.ok
    } finally {
      timeout.clear()
    }
  }
)

import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { adminLogger } from '~/lib/logger'
import { getTweetByUrl } from '~/lib/react-tweet'
import { captureWithFeature } from '~/lib/sentry'
import { adminRequiredMiddleware } from '~/server/user-auth'

export const getTweetFromUrl = createServerFn({ method: 'GET' })
  .inputValidator((url: string) => {
    return TWEET_LINK_SCHEMA.parse(url)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data: url }) => {
    try {
      return await getTweetByUrl(url)
    } catch (error) {
      adminLogger.error({ err: error, url }, 'Failed to get tweet from URL')
      captureWithFeature(error, 'admin-downloader')

      setResponseStatus(502)
      throw new Error('Impossible de récupérer le tweet')
    }
  })

const TWITTER_MEDIA_HOSTNAME = /^(video|pbs)\.twimg\.com$/

const FETCH_TWEET_VIDEO_SCHEMA = z.object({
  videoUrl: z.url({ hostname: TWITTER_MEDIA_HOSTNAME })
})

const fetchAsBase64 = async (url: string) => {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()

    return Buffer.from(buffer).toString('base64')
  } catch (error) {
    adminLogger.error({ err: error, url }, 'Failed to fetch tweet media')
    captureWithFeature(error, 'admin-downloader')
    setResponseStatus(502)
    throw new Error('Impossible de télécharger le média depuis Twitter')
  }
}

export const fetchTweetVideo = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return FETCH_TWEET_VIDEO_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data }) => {
    return fetchAsBase64(data.videoUrl)
  })

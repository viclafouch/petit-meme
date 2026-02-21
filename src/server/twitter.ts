import { z } from 'zod'
import { TWEET_LINK_SCHEMA } from '@/constants/meme'
import { adminLogger } from '@/lib/logger'
import { extractTweetIdFromUrl, getTweetById } from '@/lib/react-tweet'
import {
  adminRequiredMiddleware,
  authUserRequiredMiddleware
} from '@/server/user-auth'
import * as Sentry from '@sentry/tanstackstart-react'
import { createServerFn } from '@tanstack/react-start'

export const getTweetFromUrl = createServerFn({ method: 'GET' })
  .inputValidator((url: string) => {
    return TWEET_LINK_SCHEMA.parse(url)
  })
  .middleware([authUserRequiredMiddleware])
  .handler(async ({ data: url }) => {
    const tweetId = z.string().parse(extractTweetIdFromUrl(url))

    const tweet = await getTweetById(tweetId)

    return tweet
  })

const FETCH_TWEET_MEDIA_SCHEMA = z.object({
  videoUrl: z.url(),
  posterUrl: z.url()
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
    Sentry.captureException(error)
    throw new Error('Failed to download media from Twitter')
  }
}

export const fetchTweetMedia = createServerFn({ method: 'GET' })
  .inputValidator((data) => {
    return FETCH_TWEET_MEDIA_SCHEMA.parse(data)
  })
  .middleware([adminRequiredMiddleware])
  .handler(async ({ data }) => {
    const [video, poster] = await Promise.all([
      fetchAsBase64(data.videoUrl),
      fetchAsBase64(data.posterUrl)
    ])

    return { video, poster }
  })

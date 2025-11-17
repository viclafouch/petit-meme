import { z } from 'zod'
import { TWEET_LINK_SCHEMA } from '@/constants/meme'
import { extractTweetIdFromUrl, getTweetById } from '@/lib/react-tweet'
import { authUserRequiredMiddleware } from '@/server/user-auth'
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

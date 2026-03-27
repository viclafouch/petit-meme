import { getTweet } from 'react-tweet/api'
import { logger } from '~/lib/logger'

export class TweetNoVideoError extends Error {
  constructor(tweetId: string) {
    super(`Tweet ${tweetId} has no video`)

    Object.setPrototypeOf(this, new.target.prototype)

    this.name = this.constructor.name
  }
}

const extractTweetIdFromUrl = (tweetUrl: string) => {
  const url = new URL(tweetUrl)
  const tweetId =
    url.searchParams.get('post_id') ?? url.pathname.split('/').at(-1)

  if (!tweetId) {
    throw new Error('Could not extract tweet ID from URL')
  }

  return tweetId
}

const fetchBlob = async (url: string) => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url} with status ${response.status}`)
  }

  return response.blob()
}

export async function getTweetMedia(videoUrl: string, poster: string) {
  const [videoBlob, posterBlob] = await Promise.all([
    fetchBlob(videoUrl),
    fetchBlob(poster)
  ])

  return {
    video: {
      url: videoUrl,
      blob: videoBlob,
      extension: 'mp4' as const
    },
    poster: {
      url: poster,
      blob: posterBlob,
      extension: 'jpeg' as const
    }
  }
}

export async function getTweetByUrl(tweetUrl: string) {
  const tweetId = extractTweetIdFromUrl(tweetUrl)

  return getTweetById(tweetId)
}

const TWEET_FETCH_TIMEOUT_MS = 30000

export async function getTweetById(tweetId: string) {
  const tweet = await getTweet(tweetId, {
    signal: AbortSignal.timeout(TWEET_FETCH_TIMEOUT_MS)
  })

  if (!tweet || !tweet.video || tweet.video.variants.length === 0) {
    logger.warn({ tweetId }, 'Tweet invalid or has no video')

    throw new TweetNoVideoError(tweetId)
  }

  logger.debug({ tweetId }, 'Tweet fetched')

  const { poster } = tweet.video
  const video = tweet.video.variants.at(-1)!
  const videoUrl = video.src

  const tweetUrl = `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`

  return {
    url: tweetUrl,
    id: tweet.id_str,
    poster: {
      url: poster
    },
    video: {
      url: videoUrl
    }
  }
}

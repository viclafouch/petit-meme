import { getTweet } from 'react-tweet/api'
import { logger } from '@/lib/logger'

export function extractTweetIdFromUrl(tweetUrl: string) {
  const url = new URL(tweetUrl)

  return url.searchParams.get('post_id') ?? url.pathname.split('/').at(-1)
}

export async function getTweetMedia(videoUrl: string, poster: string) {
  const [videoBlob, posterBlob] = await Promise.all([
    fetch(videoUrl).then((response) => {
      return response.blob()
    }),
    fetch(poster).then((response) => {
      return response.blob()
    })
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

export async function getTweetById(tweetId: string) {
  const tweet = await getTweet(tweetId)

  if (!tweet || !tweet.video || tweet.video.variants.length === 0) {
    logger.warn({ tweetId }, 'Tweet invalid or has no video')

    return Promise.reject(new Error('tweet invalid'))
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

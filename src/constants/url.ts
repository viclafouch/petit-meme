import { z } from 'zod'
import { extractTweetIdFromUrl } from '~/helpers/tweet-url'

export const TWEET_LINK_SCHEMA = z
  .url({ protocol: /^https$/u, hostname: /^(twitter|x)\.com$/u })
  .refine((url) => {
    return extractTweetIdFromUrl(url) !== null
  }, 'Invalid tweet URL')

const YOUTUBE_REGEX =
  /^https:\/\/(?:(?:www\.)?youtube\.com\/watch\?v=[\w-]{11}|youtu\.be\/[\w-]{11})/u

export const YOUTUBE_LINK_SCHEMA = z
  .url({
    protocol: /^https$/u,
    hostname: /^(?:(?:www\.)?youtube\.com|youtu\.be)$/u
  })
  .regex(YOUTUBE_REGEX, 'Invalid YouTube URL')

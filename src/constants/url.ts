import { z } from 'zod'

const TWITTER_REGEX_THAT_INCLUDES_ID =
  /^https:\/\/(?:twitter\.com|x\.com)\/(?:[A-Za-z0-9_]+\/status\/\d+|i\/bookmarks\?post_id=\d+)/

export const TWEET_LINK_SCHEMA = z
  .url({ protocol: /^https$/, hostname: /^(twitter|x)\.com$/ })
  .regex(TWITTER_REGEX_THAT_INCLUDES_ID, 'Invalid tweet URL')

const YOUTUBE_REGEX =
  /^https:\/\/(?:(?:www\.)?youtube\.com\/watch\?v=[\w-]{11}|youtu\.be\/[\w-]{11})/

export const YOUTUBE_LINK_SCHEMA = z
  .url({
    protocol: /^https$/,
    hostname: /^(?:(?:www\.)?youtube\.com|youtu\.be)$/
  })
  .regex(YOUTUBE_REGEX, 'Invalid YouTube URL')

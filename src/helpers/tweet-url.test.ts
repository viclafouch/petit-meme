import { describe, expect, it } from 'vitest'
import { extractTweetIdFromUrl } from '~/helpers/tweet-url'

const TWEET_ID = '2081431421944471694'

const URLS_WITH_TWEET_ID = [
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}/`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}/video/1`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}/video/2`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}/photo/1`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}?s=20&t=oMLuUpAO`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}/video/1?s=20`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}#comments`,
  `https://twitter.com/Monty_Brogan69/status/${TWEET_ID}`,
  `https://twitter.com/Monty_Brogan69/status/${TWEET_ID}/video/1`,
  `https://x.com/i/bookmarks?post_id=${TWEET_ID}`,
  `https://x.com/i/bookmarks?cursor=abc&post_id=${TWEET_ID}`
]

const URLS_WITHOUT_TWEET_ID = [
  'https://x.com/Monty_Brogan69',
  'https://x.com/Monty_Brogan69/status/not-a-number',
  `https://x.com/Monty_Brogan69/statuses/${TWEET_ID}`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}/analytics`,
  `https://x.com/Monty_Brogan69/status/${TWEET_ID}/video`,
  `http://x.com/Monty_Brogan69/status/${TWEET_ID}`,
  `https://x.com.evil.test/Monty_Brogan69/status/${TWEET_ID}`,
  `https://evil.test/https://x.com/Monty_Brogan69/status/${TWEET_ID}`,
  'https://x.com/i/bookmarks',
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'not a url at all'
]

describe('extractTweetIdFromUrl', () => {
  describe('given a URL that carries a tweet ID', () => {
    it.each(URLS_WITH_TWEET_ID)('should extract it from %s', (url) => {
      // #when
      const tweetId = extractTweetIdFromUrl(url)

      // #then
      expect(tweetId).toBe(TWEET_ID)
    })
  })

  describe('given a URL that carries no tweet ID', () => {
    it.each(URLS_WITHOUT_TWEET_ID)('should return null for %s', (url) => {
      // #when
      const tweetId = extractTweetIdFromUrl(url)

      // #then
      expect(tweetId).toBeNull()
    })
  })

  describe('given an empty string', () => {
    it('should return null', () => {
      // #when
      const tweetId = extractTweetIdFromUrl('')

      // #then
      expect(tweetId).toBeNull()
    })
  })
})

const TWEET_STATUS_URL_REGEX =
  /^https:\/\/(?:twitter|x)\.com\/[A-Za-z0-9_]+\/status\/(?<tweetId>\d+)(?:\/(?:video|photo)\/\d+)?\/?(?:[?#].*)?$/u

const TWEET_BOOKMARK_URL_REGEX =
  /^https:\/\/(?:twitter|x)\.com\/i\/bookmarks\/?\?(?:[^#]*&)?post_id=(?<tweetId>\d+)(?:[&#].*)?$/u

export const extractTweetIdFromUrl = (tweetUrl: string) => {
  const match =
    TWEET_STATUS_URL_REGEX.exec(tweetUrl) ??
    TWEET_BOOKMARK_URL_REGEX.exec(tweetUrl)

  return match?.groups?.tweetId ?? null
}

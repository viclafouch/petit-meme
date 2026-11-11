import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { buildCrawlerStreamUrl } from '~/server/platforms/bunny.server'

export const getCrawlerStreamUrl = createIsomorphicFn()
  .server(async (bunnyId: string) => {
    const { matchIsVerifiedGooglebot } =
      await import('~/server/seo/googlebot.server')
    const isVerifiedGooglebot = await matchIsVerifiedGooglebot(
      getRequest().headers
    )

    return isVerifiedGooglebot ? buildCrawlerStreamUrl(bunnyId) : null
  })
  .client(async () => {
    return null
  })

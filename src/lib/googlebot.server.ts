import { BlockList, isIP } from 'node:net'
import { z } from 'zod'
import { getCache, waitUntil } from '@vercel/functions'
import { ONE_DAY_IN_SECONDS } from '~/constants/time'
import { extractClientIp } from '~/helpers/request'
import { captureWithFeature } from '~/lib/sentry'
import { fetchWithZod } from '~/lib/utils'

const IPV4_FAMILY = 4
const GOOGLEBOT_IP_RANGES_URL =
  'https://developers.google.com/static/crawling/ipranges/common-crawlers.json'
const GOOGLEBOT_IP_RANGES_CACHE_KEY = 'common-crawlers'
const GOOGLEBOT_USER_AGENT_PATTERN = /Googlebot/u

const GOOGLEBOT_IP_RANGES_SCHEMA = z.object({
  prefixes: z.array(
    z.union([
      z.object({ ipv4Prefix: z.string() }),
      z.object({ ipv6Prefix: z.string() })
    ])
  )
})

type GooglebotIpRanges = z.infer<typeof GOOGLEBOT_IP_RANGES_SCHEMA>

const buildGooglebotBlockList = ({ prefixes }: GooglebotIpRanges) => {
  const blockList = new BlockList()

  for (const prefix of prefixes) {
    const isIpv4 = 'ipv4Prefix' in prefix
    const [network = '', length = ''] = (
      isIpv4 ? prefix.ipv4Prefix : prefix.ipv6Prefix
    ).split('/')

    blockList.addSubnet(network, Number(length), isIpv4 ? 'ipv4' : 'ipv6')
  }

  return blockList
}

type MatchIsGooglebotIpParams = {
  ip: string
  ranges: GooglebotIpRanges
}

export const matchIsGooglebotIp = ({
  ip,
  ranges
}: MatchIsGooglebotIpParams) => {
  const family = isIP(ip)

  if (family === 0) {
    return false
  }

  return buildGooglebotBlockList(ranges).check(
    ip,
    family === IPV4_FAMILY ? 'ipv4' : 'ipv6'
  )
}

const readGooglebotIpRanges = async () => {
  const runtimeCache = getCache({ namespace: 'googlebot' })
  const cached = GOOGLEBOT_IP_RANGES_SCHEMA.safeParse(
    await runtimeCache.get(GOOGLEBOT_IP_RANGES_CACHE_KEY)
  )

  if (cached.success) {
    return cached.data
  }

  const ranges = await fetchWithZod(
    GOOGLEBOT_IP_RANGES_SCHEMA,
    GOOGLEBOT_IP_RANGES_URL
  )

  waitUntil(
    runtimeCache.set(GOOGLEBOT_IP_RANGES_CACHE_KEY, ranges, {
      ttl: ONE_DAY_IN_SECONDS
    })
  )

  return ranges
}

export const matchIsVerifiedGooglebot = async (headers: Headers) => {
  const userAgent = headers.get('user-agent') ?? ''

  if (!GOOGLEBOT_USER_AGENT_PATTERN.test(userAgent)) {
    return false
  }

  try {
    return matchIsGooglebotIp({
      ip: extractClientIp(headers),
      ranges: await readGooglebotIpRanges()
    })
  } catch (error) {
    captureWithFeature(error, 'googlebot-verification')

    return false
  }
}

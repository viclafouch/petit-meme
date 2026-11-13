import {
  MEME_FIRST_FRAME_FILE_NAME,
  ORIGINAL_ACCESS_HEADER
} from '~/constants/bunny'
import { HTTP_STATUS } from '~/constants/http'
import { FIVE_MINUTES_IN_SECONDS, SECOND } from '~/constants/time'
import {
  signVideoFileUrl,
  signVideoPlaybackUrl
} from '~/server/platforms/bunny-token.server'

export type BunnyZone = {
  hostname: string
  imagesHostname: string
  videoId: string
  tokenAuthKey: string
  originalAccessKey: string
}

type ZoneRequest = {
  url: string
  headers?: Record<string, string>
}

type ZoneExpectation = 'served' | 'refused'

type ZoneProbe = {
  name: string
  expectation: ZoneExpectation
  buildRequest: (zone: BunnyZone) => Promise<ZoneRequest>
}

const PROBE_TIMEOUT_MS = 15_000

const FIRST_BYTE_RANGE = 'bytes=0-0'

const MP4_FALLBACK_FILE = 'play_240p.mp4'

const EXPECTED_STATUSES = {
  served: [HTTP_STATUS.OK, HTTP_STATUS.PARTIAL_CONTENT],
  refused: [HTTP_STATUS.FORBIDDEN]
} as const satisfies Record<ZoneExpectation, readonly number[]>

const buildZoneUrl = (zone: BunnyZone, file: string) => {
  return `https://${zone.hostname}/${zone.videoId}/${file}`
}

const buildImagesZoneUrl = (zone: BunnyZone, file: string) => {
  return `https://${zone.imagesHostname}/${zone.videoId}/${file}`
}

const getExpiresAt = () => {
  return Math.floor(Date.now() / SECOND) + FIVE_MINUTES_IN_SECONDS
}

const signPlaybackUrl = (zone: BunnyZone, file: string) => {
  return signVideoPlaybackUrl({
    hostname: zone.hostname,
    videoId: zone.videoId,
    file,
    securityKey: zone.tokenAuthKey,
    expiresAt: getExpiresAt()
  })
}

const signFileUrl = (zone: BunnyZone, file: string) => {
  return signVideoFileUrl({
    hostname: zone.hostname,
    videoId: zone.videoId,
    file,
    securityKey: zone.tokenAuthKey,
    expiresAt: getExpiresAt()
  })
}

const readFirstPlaylistEntry = async (playlistUrl: string) => {
  const response = await fetch(playlistUrl, {
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`A signed playlist answered ${response.status}`)
  }

  const playlist = await response.text()
  const entry = playlist.split(/\r?\n/u).find((line) => {
    return line !== '' && !line.startsWith('#')
  })

  if (entry === undefined) {
    throw new Error('A signed playlist lists no entry')
  }

  return new URL(entry, playlistUrl).toString()
}

export const BUNNY_ZONE_PROBES = [
  {
    name: 'the unsigned playlist is refused',
    expectation: 'refused',
    buildRequest: async (zone) => {
      return { url: buildZoneUrl(zone, 'playlist.m3u8') }
    }
  },
  {
    name: 'the unsigned MP4 fallback is refused',
    expectation: 'refused',
    buildRequest: async (zone) => {
      return { url: buildZoneUrl(zone, MP4_FALLBACK_FILE) }
    }
  },
  {
    name: 'the signed playlist is served',
    expectation: 'served',
    buildRequest: async (zone) => {
      return { url: await signPlaybackUrl(zone, 'playlist.m3u8') }
    }
  },
  {
    name: 'the signed segments are served',
    expectation: 'served',
    buildRequest: async (zone) => {
      const variantUrl = await readFirstPlaylistEntry(
        await signPlaybackUrl(zone, 'playlist.m3u8')
      )

      return { url: await readFirstPlaylistEntry(variantUrl) }
    }
  },
  {
    name: 'the thumbnail is public',
    expectation: 'served',
    buildRequest: async (zone) => {
      return { url: buildZoneUrl(zone, 'thumbnail.jpg') }
    }
  },
  {
    name: 'the preview is public',
    expectation: 'served',
    buildRequest: async (zone) => {
      return { url: buildZoneUrl(zone, 'preview.webp') }
    }
  },
  {
    name: 'the first frame is public',
    expectation: 'served',
    buildRequest: async (zone) => {
      return { url: buildImagesZoneUrl(zone, MEME_FIRST_FRAME_FILE_NAME) }
    }
  },
  {
    name: 'the original is refused with the playback token',
    expectation: 'refused',
    buildRequest: async (zone) => {
      return { url: await signPlaybackUrl(zone, 'original') }
    }
  },
  {
    name: `the original is refused without ${ORIGINAL_ACCESS_HEADER}`,
    expectation: 'refused',
    buildRequest: async (zone) => {
      return { url: await signFileUrl(zone, 'original') }
    }
  },
  {
    name: `the original is served with ${ORIGINAL_ACCESS_HEADER}`,
    expectation: 'served',
    buildRequest: async (zone) => {
      return {
        url: await signFileUrl(zone, 'original'),
        headers: { [ORIGINAL_ACCESS_HEADER]: zone.originalAccessKey }
      }
    }
  },
  {
    name: 'the MP4 fallback is refused with the playback token',
    expectation: 'refused',
    buildRequest: async (zone) => {
      return { url: await signPlaybackUrl(zone, MP4_FALLBACK_FILE) }
    }
  },
  {
    name: `the MP4 fallback is served with ${ORIGINAL_ACCESS_HEADER}`,
    expectation: 'served',
    buildRequest: async (zone) => {
      return {
        url: await signFileUrl(zone, MP4_FALLBACK_FILE),
        headers: { [ORIGINAL_ACCESS_HEADER]: zone.originalAccessKey }
      }
    }
  }
] as const satisfies readonly ZoneProbe[]

export const runZoneProbe = async (zone: BunnyZone, probe: ZoneProbe) => {
  const { url, headers } = await probe.buildRequest(zone)
  const response = await fetch(url, {
    headers: { ...headers, Range: FIRST_BYTE_RANGE },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
  })
  await response.body?.cancel()
  const expectedStatuses: readonly number[] =
    EXPECTED_STATUSES[probe.expectation]

  return {
    status: response.status,
    expectedStatuses,
    isHonored: expectedStatuses.includes(response.status)
  }
}

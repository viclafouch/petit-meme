import { z } from 'zod'
import { serverEnv } from '~/env/server.server'
import { fetchWithZod } from '~/server/http/fetch.server'
import { buildLibraryApiUrl } from '~/server/platforms/bunny.server'
import {
  BUNNY_ZONE_PROBES,
  type BunnyZone,
  runZoneProbe
} from './lib/bunny-zone-contract'

const API_FINISHED_VIDEO_STATUS = 4

const CANDIDATE_VIDEO_COUNT = 10

const VIDEO_LIST_SCHEMA = z.object({
  items: z.array(z.object({ guid: z.string(), status: z.number() }))
})

const findPlayableVideoId = async () => {
  const { items } = await fetchWithZod(
    VIDEO_LIST_SCHEMA,
    buildLibraryApiUrl(
      `/videos?page=1&itemsPerPage=${CANDIDATE_VIDEO_COUNT}&orderBy=date`
    ),
    {
      headers: {
        AccessKey: serverEnv.BUNNY_READ_ONLY_API_KEY,
        Accept: 'application/json'
      }
    }
  )
  const finishedVideo = items.find((video) => {
    return video.status === API_FINISHED_VIDEO_STATUS
  })

  if (finishedVideo === undefined) {
    throw new Error('The library holds no finished video to probe')
  }

  return finishedVideo.guid
}

const checkBunnyZone = async () => {
  const zone = {
    hostname: serverEnv.VITE_BUNNY_HOSTNAME,
    videoId: await findPlayableVideoId(),
    tokenAuthKey: serverEnv.BUNNY_TOKEN_AUTH_KEY,
    originalAccessKey: serverEnv.BUNNY_ORIGINAL_ACCESS_KEY
  } satisfies BunnyZone

  console.log(`Pull zone:       ${zone.hostname}`)
  console.log(`Bunny library:   ${serverEnv.BUNNY_LIBRARY_ID}`)
  console.log(`Probed video:    ${zone.videoId}\n`)

  const results = await Promise.all(
    BUNNY_ZONE_PROBES.map(async (probe) => {
      return { probe, ...(await runZoneProbe(zone, probe)) }
    })
  )

  for (const { probe, status, expectedStatuses, isHonored } of results) {
    console.log(
      isHonored
        ? `✓ ${probe.name} (${status})`
        : `✗ ${probe.name}: answered ${status}, expected ${expectedStatuses.join(' or ')}`
    )
  }

  const driftCount = results.filter(({ isHonored }) => {
    return !isHonored
  }).length

  console.log(
    driftCount === 0
      ? '\nThe zone honours the contract.'
      : `\nThe zone drifts from the contract on ${driftCount} probe(s).`
  )

  process.exit(driftCount === 0 ? 0 : 1)
}

void checkBunnyZone()

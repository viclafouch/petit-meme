import { createFileRoute } from '@tanstack/react-router'
import { prismaClient } from '~/db'
import { MEME_ALGOLIA_INCLUDE, type MemeAlgoliaData } from '~/constants/meme'
import { serverEnv } from '~/env/server'
import { replaceAllIndicesWithMemes } from '~/lib/algolia'
import { cronLogger } from '~/lib/logger'
import { verifyCronSecret } from '~/utils/cron-auth'

const log = cronLogger.child({ job: 'sync-algolia' })

const BATCH_SIZE = 500

type FetchAllMemesParams = {
  memes: MemeAlgoliaData[]
  cursor?: string
}

const fetchAllMemes = async ({
  memes,
  cursor
}: FetchAllMemesParams): Promise<MemeAlgoliaData[]> => {
  const batch = await prismaClient.meme.findMany({
    take: BATCH_SIZE,
    ...(cursor === undefined ? {} : { skip: 1, cursor: { id: cursor } }),
    orderBy: { id: 'asc' },
    include: MEME_ALGOLIA_INCLUDE
  })

  if (batch.length === 0) {
    return memes
  }

  return fetchAllMemes({
    memes: [...memes, ...batch],
    cursor: batch.at(-1)?.id
  })
}

export const Route = createFileRoute('/api/cron/sync-algolia')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authError = verifyCronSecret({
          request,
          secret: serverEnv.CRON_SECRET
        })

        if (authError) {
          return authError
        }

        try {
          const allMemes = await fetchAllMemes({ memes: [] })

          const results = await replaceAllIndicesWithMemes(allMemes)

          const summary = Object.fromEntries(
            results.map(({ locale, count }) => {
              return [locale, count]
            })
          )

          log.info(
            { totalMemes: allMemes.length, indices: summary },
            'Sync completed'
          )

          return Response.json({
            success: true,
            totalMemes: allMemes.length,
            indices: summary
          })
        } catch (error) {
          log.error({ error }, 'Algolia sync cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})

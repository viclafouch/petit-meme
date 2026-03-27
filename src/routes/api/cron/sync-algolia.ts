/* eslint-disable no-await-in-loop */
import { MEME_ALGOLIA_INCLUDE, type MemeAlgoliaData } from '~/constants/meme'
import { prismaClient } from '~/db'
import { replaceAllIndicesWithMemes } from '~/lib/algolia'
import { cronLogger } from '~/lib/logger'
import { verifyCronSecret } from '~/utils/cron-auth'
import { createFileRoute } from '@tanstack/react-router'

const log = cronLogger.child({ job: 'sync-algolia' })

const BATCH_SIZE = 500

export const Route = createFileRoute('/api/cron/sync-algolia')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authError = verifyCronSecret(request)

        if (authError) {
          return authError
        }

        try {
          const allMemes: MemeAlgoliaData[] = []
          let cursor: string | undefined

          while (true) {
            const memes = await prismaClient.meme.findMany({
              take: BATCH_SIZE,
              ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
              orderBy: { id: 'asc' },
              include: MEME_ALGOLIA_INCLUDE
            })

            if (memes.length === 0) {
              break
            }

            allMemes.push(...memes)

            cursor = memes.at(-1)?.id
          }

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
          log.error({ err: error }, 'Algolia sync cron failed')

          return Response.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
          )
        }
      }
    }
  }
})

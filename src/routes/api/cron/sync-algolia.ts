/* eslint-disable no-await-in-loop */
import { prismaClient } from '@/db'
import {
  algoliaAdminClient,
  algoliaIndexName,
  memeToAlgoliaRecord
} from '@/lib/algolia'
import { cronLogger } from '@/lib/logger'
import { verifyCronSecret } from '@/utils/cron-auth'
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
          const records = []
          let cursor: string | undefined

          while (true) {
            const memes = await prismaClient.meme.findMany({
              take: BATCH_SIZE,
              ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
              orderBy: { id: 'asc' },
              include: {
                video: true,
                categories: {
                  include: { category: true }
                }
              }
            })

            if (memes.length === 0) {
              break
            }

            records.push(...memes.map(memeToAlgoliaRecord))

            cursor = memes.at(-1)?.id
          }

          await algoliaAdminClient.replaceAllObjects({
            indexName: algoliaIndexName,
            objects: records
          })

          log.info({ totalRecords: records.length }, 'Sync completed')

          return Response.json({
            success: true,
            totalRecords: records.length
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

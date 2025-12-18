import * as R from 'remeda'
import { z } from 'zod'
import type { MemeWithVideo } from '@/constants/meme'
import { prismaClient } from '@/db'
import { createServerFn } from '@tanstack/react-start'

export const getInfiniteReels = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    return z
      .object({
        excludedIds: z.array(z.string()).default([])
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const { excludedIds } = data

    const memes = await prismaClient
      .$queryRawUnsafe<{ meme: MemeWithVideo }[]>(
        `
      SELECT json_build_object(
        'id', m."id",
        'title', m."title",
        'viewCount', m."viewCount",
        'tweetUrl', m."tweetUrl",
        'keywords', m."keywords",
        'publishedAt', m."publishedAt",
        'updatedAt', m."updatedAt",
        'status', m."status",
        'submittedBy', m."submittedBy",
        'video', row_to_json(v)
      ) AS meme
      FROM "Meme" m
      JOIN "Video" v ON m."videoId" = v."id"
      WHERE m."status" = 'PUBLISHED'
      ${
        excludedIds.length
          ? `AND m."id" NOT IN (${excludedIds
              .map((id) => {
                return `'${id}'`
              })
              .join(',')})`
          : ''
      }
      ORDER BY RANDOM()
      LIMIT 20
    `
      )
      .then((result) => {
        return result.map(({ meme }) => {
          return meme
        })
      })

    const newExcludedIds = [
      ...R.takeLast(excludedIds, excludedIds.length / 2),
      ...memes.map(R.prop('id'))
    ]

    return {
      memes,
      excludedIds: newExcludedIds
    }
  })

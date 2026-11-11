import { createAnthropicChat } from '@tanstack/ai-anthropic'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { waitUntil } from '@vercel/functions'
import {
  AI_SEARCH_INPUT_SCHEMA,
  AI_SEARCH_MODEL,
  AI_SEARCH_TIMEOUT_MS,
  DAILY_GLOBAL_AI_SEARCH_CAP,
  MAX_AI_SEARCH_RESULTS
} from '~/constants/ai-search'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'
import { RATE_LIMIT_AI_SEARCH } from '~/constants/rate-limit'
import { lockUntilTransactionEnds } from '~/db/advisory-lock.server'
import { prismaClient } from '~/db/client.server'
import type { Prisma } from '~/db/generated/prisma/client'
import { ActivityEventType } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server.server'
import { buildCapState, FREE_CAPS } from '~/helpers/cap'
import { truncateToUtcDay, truncateToUtcMonth } from '~/helpers/date'
import { withTimeout } from '~/helpers/promise'
import { aiSearchLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { getLocale, type Locale } from '~/paraglide/runtime'
import { recordActivityEvent } from '~/server/activity/activity.server'
import { requestSearchKeywords } from '~/server/ai-search/ai-search.server'
import { userRequiredMiddleware } from '~/server/auth/auth.middleware'
import { findCapState, throwCapReached } from '~/server/cap/cap.server'
import { throwWithStatus } from '~/server/http/http.server'
import { searchMemes } from '~/server/meme/meme-index.server'
import {
  buildAlgoliaPublishedFilter,
  resolveAlgoliaIndexName
} from '~/server/platforms/algolia.server'
import {
  createRateLimitMiddleware,
  createUserRateLimitMiddleware
} from '~/server/rate-limit/rate-limit.middleware'
import { matchIsUserPremium } from '~/server/subscription/subscription.server'

const extractSearchKeywordsOrPrompt = async (
  prompt: string,
  locale: Locale
) => {
  try {
    const adapter = createAnthropicChat(
      AI_SEARCH_MODEL,
      serverEnv.ANTHROPIC_API_KEY
    )

    return await withTimeout(
      (abortController) => {
        return requestSearchKeywords({
          adapter,
          prompt,
          locale,
          abortController
        })
      },
      AI_SEARCH_TIMEOUT_MS,
      `AI search: timeout after ${AI_SEARCH_TIMEOUT_MS}ms`
    )
  } catch (error) {
    captureWithFeature(error, 'ai-search')
    aiSearchLogger.error(
      { error, prompt },
      'Haiku extraction failed, using raw prompt as fallback'
    )

    return [prompt]
  }
}

const AI_SEARCH_QUOTA_LOCK_KEY = 'ai-search-quota'

type ReserveAiSearchParams = Pick<
  Prisma.AiSearchLogUncheckedCreateInput,
  'userId' | 'prompt' | 'locale'
> & {
  isPremium: boolean
}

const reserveAiSearch = ({
  userId,
  isPremium,
  prompt,
  locale
}: ReserveAiSearchParams) => {
  return prismaClient.$transaction(async (transaction) => {
    await lockUntilTransactionEnds(transaction, AI_SEARCH_QUOTA_LOCK_KEY)

    const now = new Date()
    const dailyCount = await transaction.aiSearchLog.count({
      where: { createdAt: { gte: truncateToUtcDay(now) } }
    })

    if (dailyCount >= DAILY_GLOBAL_AI_SEARCH_CAP) {
      aiSearchLogger.warn({ dailyCount }, 'Daily global AI search cap reached')

      return throwWithStatus(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        new AppError('ai_search_unavailable', { code: 'AI_SEARCH_UNAVAILABLE' })
      )
    }

    const monthlyCount = await transaction.aiSearchLog.count({
      where: { userId, createdAt: { gte: truncateToUtcMonth(now) } }
    })

    if (!isPremium && monthlyCount >= FREE_CAPS.aiSearch) {
      return throwCapReached('aiSearch')
    }

    const { id } = await transaction.aiSearchLog.create({
      data: {
        userId,
        prompt,
        keywords: [],
        memeIds: [],
        locale,
        resultCount: 0
      },
      select: { id: true }
    })

    return { id, monthlyCount: monthlyCount + 1 }
  })
}

const refundAiSearch = async (aiSearchLogId: string) => {
  try {
    await prismaClient.aiSearchLog.delete({ where: { id: aiSearchLogId } })
  } catch (error) {
    captureWithFeature(error, 'ai-search')
    aiSearchLogger.error({ error, aiSearchLogId }, 'Failed to refund AI search')
  }
}

const completeAiSearchLog = async (
  aiSearchLogId: string,
  result: Pick<
    Prisma.AiSearchLogUpdateInput,
    'keywords' | 'memeIds' | 'resultCount'
  >
) => {
  try {
    await prismaClient.aiSearchLog.update({
      where: { id: aiSearchLogId },
      data: result
    })
  } catch (error) {
    captureWithFeature(error, 'ai-search')
    aiSearchLogger.error({ error, aiSearchLogId }, 'Failed to log AI search')
  }
}

export const searchMemesWithAi = createServerFn({ method: 'POST' })
  .validator((data) => {
    return AI_SEARCH_INPUT_SCHEMA.parse(data)
  })
  .middleware([
    createRateLimitMiddleware(RATE_LIMIT_AI_SEARCH),
    createUserRateLimitMiddleware(RATE_LIMIT_AI_SEARCH)
  ])
  .handler(async ({ data, context }) => {
    const locale = getLocale()
    const userId = context.user.id
    const isPremium = await matchIsUserPremium(context.user)
    const reservation = await reserveAiSearch({
      userId,
      isPremium,
      prompt: data.prompt,
      locale
    })

    const keywords = await extractSearchKeywordsOrPrompt(data.prompt, locale)

    const query = keywords.join(' ')
    const indexName = resolveAlgoliaIndexName(locale)
    const filters = buildAlgoliaPublishedFilter(
      data.contentLocale === undefined ? undefined : [data.contentLocale]
    )

    const searchPage = await searchMemes({
      indexName,
      query,
      page: 0,
      hitsPerPage: MAX_AI_SEARCH_RESULTS,
      filters,
      removeWordsIfNoResults: 'allOptional'
    }).catch(async (error: unknown) => {
      captureWithFeature(error, 'ai-search')
      aiSearchLogger.error({ error, query, filters }, 'Algolia search failed')
      await refundAiSearch(reservation.id)

      return throwWithStatus(
        HTTP_STATUS.BAD_GATEWAY,
        new Error('AI search failed', { cause: error })
      )
    })

    const { memes, queryID } = searchPage
    const memeIds = memes.map((meme) => {
      return meme.id
    })

    waitUntil(
      completeAiSearchLog(reservation.id, {
        keywords,
        memeIds,
        resultCount: memes.length
      })
    )

    recordActivityEvent({
      type: ActivityEventType.AI_SEARCH,
      actor: context.user,
      headers: getRequest().headers,
      metadata: { prompt: data.prompt }
    })

    aiSearchLogger.info(
      {
        userId,
        query,
        resultCount: memes.length
      },
      'AI search completed'
    )

    return {
      memes,
      keywords,
      queryID,
      quota: buildCapState({
        kind: 'aiSearch',
        usedCount: reservation.monthlyCount,
        isPremium
      })
    }
  })

export const getAiSearchQuota = createServerFn({ method: 'GET' })
  .middleware([userRequiredMiddleware])
  .handler(({ context }) => {
    return findCapState({ user: context.user, kind: 'aiSearch' })
  })

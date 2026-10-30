import { expect } from '@playwright/test'
import { prismaClient } from '~/db'
import { DAILY_GLOBAL_AI_SEARCH_CAP } from '~/constants/ai-search'
import { HTTP_STATUS } from '~/constants/http'
import { UserLocale } from '~/db/generated/prisma/enums'
import { truncateToUtcDay } from '~/helpers/date'
import { AI_SEARCH_PATH, submitPrompt } from './ai-search'
import { E2E_ROLES } from './constants'
import { E2E_UNIQUE_SEARCH_WORD } from './content'
import { resolveStorageStatePath } from './env'
import { test } from './fixtures'
import {
  holdServerFunctionCall,
  repeat,
  sendServerFunctionCallsAtOnce
} from './server-functions'

const SEARCHES_LEFT_TODAY = 2
const CONCURRENT_SEARCH_COUNT = 5

const fillTheDayUpTo = async (searchCount: number) => {
  const searchesToday = await prismaClient.aiSearchLog.count({
    where: { createdAt: { gte: truncateToUtcDay(new Date()) } }
  })

  await prismaClient.aiSearchLog.createMany({
    data: Array.from({ length: searchCount - searchesToday }, (_, index) => {
      return {
        userId: E2E_ROLES.aiSearchGlobalCap.id,
        prompt: `e2e global cap filler ${index + 1}`,
        keywords: [],
        memeIds: [],
        locale: UserLocale.fr,
        resultCount: 0
      }
    })
  })
}

test.describe('a Premium searching when the day nears its global cap', () => {
  test.describe.configure({ retries: 0 })
  test.use({ storageState: resolveStorageStatePath('aiSearchGlobalCap') })

  test('gets the last searches of the day and not one more', async ({
    page
  }) => {
    await fillTheDayUpTo(DAILY_GLOBAL_AI_SEARCH_CAP - SEARCHES_LEFT_TODAY)
    await page.goto(AI_SEARCH_PATH)

    const call = await holdServerFunctionCall(page, () => {
      return submitPrompt(page, E2E_UNIQUE_SEARCH_WORD)
    })
    const statuses = await sendServerFunctionCallsAtOnce({
      page,
      call,
      bodies: repeat(call.body, CONCURRENT_SEARCH_COUNT),
      clientIp: 'e2e-ai-search-global-cap'
    })

    expect(statuses).toStrictEqual([
      ...repeat(HTTP_STATUS.OK, SEARCHES_LEFT_TODAY),
      ...repeat(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        CONCURRENT_SEARCH_COUNT - SEARCHES_LEFT_TODAY
      )
    ])
  })
})

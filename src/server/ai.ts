import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { HTTP_STATUS } from '~/constants/http'
import { getErrorMessage } from '~/helpers/error'
import { adminLogger } from '~/lib/logger'
import {
  type MemeDraftTranslation,
  translateMemeDraft
} from '~/lib/meme-draft.server'
import { locales } from '~/paraglide/runtime'
import { adminRequiredMiddleware } from '~/server/user-auth'

const GEMINI_TRANSLATION_TIMEOUT_MS = 60_000

export type AiAssistResult = MemeDraftTranslation

export const translateMemeContent = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator((data) => {
    return z
      .object({
        sourceLocale: z.enum(locales),
        targetLocales: z.array(z.enum(locales)).min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        keywords: z.array(z.string()).min(1)
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    try {
      const translated = await translateMemeDraft({
        ...data,
        timeoutMs: GEMINI_TRANSLATION_TIMEOUT_MS
      })

      adminLogger.info(
        { sourceLocale: data.sourceLocale, targetLocales: data.targetLocales },
        'AI translation completed'
      )

      return translated
    } catch (error) {
      adminLogger.error(
        { error, sourceLocale: data.sourceLocale },
        'AI translation failed'
      )
      setResponseStatus(HTTP_STATUS.BAD_GATEWAY)
      throw new Error(`La traduction AI a échoué : ${getErrorMessage(error)}`, {
        cause: error
      })
    }
  })

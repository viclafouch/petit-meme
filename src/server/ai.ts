import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { HTTP_STATUS } from '~/constants/http'
import { prismaClient } from '~/db/client.server'
import { getErrorMessage } from '~/helpers/error'
import { adminLogger } from '~/lib/logger'
import {
  fetchMemeVideo,
  type MemeDraftTranslation,
  translateMemeDraft,
  writeMemeDraft
} from '~/lib/meme-draft.server'
import { locales } from '~/paraglide/runtime'
import { adminRequiredMiddleware } from '~/server/user-auth'

const CUSTOM_PROMPT_MAX_LENGTH = 500
const GEMINI_TRANSLATION_TIMEOUT_MS = 60_000
const GEMINI_VIDEO_TIMEOUT_MS = 150_000

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

export const aiAssistMemeContent = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .validator((data) => {
    return z
      .object({
        memeId: z.string(),
        customPrompt: z.string().max(CUSTOM_PROMPT_MAX_LENGTH),
        targetLocale: z.enum(locales)
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const meme = await prismaClient.meme.findUnique({
      where: { id: data.memeId },
      select: { video: { select: { bunnyId: true } } }
    })

    if (!meme) {
      adminLogger.warn(
        { memeId: data.memeId },
        'Meme not found for AI generation'
      )
      setResponseStatus(HTTP_STATUS.NOT_FOUND)
      throw new Error('Mème introuvable')
    }

    try {
      const video = await fetchMemeVideo(meme.video.bunnyId)

      if (!video) {
        throw new Error('La vidéo est introuvable chez Bunny')
      }

      const draft = await writeMemeDraft({
        video,
        customPrompt: data.customPrompt,
        targetLocale: data.targetLocale,
        categories: [],
        timeoutMs: GEMINI_VIDEO_TIMEOUT_MS
      })

      adminLogger.info(
        { memeId: data.memeId, targetLocale: data.targetLocale },
        'AI assist content generated'
      )

      return {
        title: draft.title,
        description: draft.description,
        keywords: draft.keywords
      } satisfies AiAssistResult
    } catch (error) {
      adminLogger.error(
        { error, memeId: data.memeId },
        'AI assist content generation failed'
      )
      setResponseStatus(HTTP_STATUS.BAD_GATEWAY)
      throw new Error(`AI Assist a échoué : ${getErrorMessage(error)}`, {
        cause: error
      })
    }
  })

import { z } from 'zod/v3'
import zodToJsonSchema from 'zod-to-json-schema'
import { MEME_TRANSLATION_SELECT } from '@/constants/meme'
import { prismaClient } from '@/db'
import { serverEnv } from '@/env/server'
import {
  CONTENT_LOCALE_TO_LOCALE,
  resolveMemeTranslation
} from '@/helpers/i18n-content'
import { withTimeout } from '@/helpers/promise'
import { buildSignedOriginalUrl } from '@/lib/bunny'
import { adminLogger } from '@/lib/logger'
import { captureWithFeature } from '@/lib/sentry'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { GoogleGenAI } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

const videoSchema = z.object({
  description: z
    .string()
    .describe(
      "La description de la vidéo, utile pour le SEO en expliquant que c'est un mème (200 caractères maximum)"
    ),
  keywords: z.array(z.string()).describe('Mots clefs de la vidéo')
})

const ai = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY })

const GEMINI_MODEL = 'gemini-3-flash-preview'
const GEMINI_TIMEOUT_MS = 8_000

export const generateMemeContent = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return z
      .object({
        memeId: z.string()
      })
      .parse(data)
  })
  .handler(async ({ data }) => {
    const meme = await prismaClient.meme.findUnique({
      where: {
        id: data.memeId
      },
      include: {
        video: true,
        translations: {
          select: MEME_TRANSLATION_SELECT
        }
      }
    })

    if (!meme) {
      adminLogger.warn(
        { memeId: data.memeId },
        'Meme not found for AI generation'
      )
      setResponseStatus(404)
      throw new Error('Mème introuvable')
    }

    const nativeLocale = CONTENT_LOCALE_TO_LOCALE[meme.contentLocale]
    const resolved = resolveMemeTranslation({
      translations: meme.translations,
      contentLocale: meme.contentLocale,
      requestedLocale: nativeLocale,
      fallback: meme
    })

    const originalUrl = await buildSignedOriginalUrl(meme.video.bunnyId)

    const contents = [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              mimeType: 'video/mp4',
              fileUri: originalUrl
            }
          },
          {
            text: `Cette vidéo est un mème. Le titre de la vidéo est "${resolved.title}". En français, que se passe-t-il dans cette vidéo ? Donne moi une description pertinente courte pour le SEO et les moteurs de recherche. Ta réponse ne doit intégrer que la description exacte (150 caractères grand maximum) de la vidéo en expliquant que c'est un mème. Le mème est surement populaire. Cherche pourquoi. Cela doit toujours commencer par : "Découvrez et téléchargez ce mème de [ta mini description de 150 caractères grand grand max]`
          }
        ]
      }
    ]

    try {
      const result = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: zodToJsonSchema(videoSchema)
          }
        }),
        GEMINI_TIMEOUT_MS,
        `Génération AI : timeout après ${GEMINI_TIMEOUT_MS}ms`
      )

      if (!result.text) {
        setResponseStatus(502)
        throw new Error('La génération AI a échoué : réponse vide')
      }

      const parsed = videoSchema.parse(JSON.parse(result.text))

      adminLogger.info({ memeId: data.memeId }, 'AI content generated')

      return parsed
    } catch (error) {
      captureWithFeature(error, 'ai-generation')
      adminLogger.error(
        { err: error, memeId: data.memeId },
        'AI content generation failed'
      )
      setResponseStatus(502)
      throw new Error('La génération AI a échoué')
    }
  })

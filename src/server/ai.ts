import { z } from 'zod/v3'
import zodToJsonSchema from 'zod-to-json-schema'
import { MEME_TRANSLATION_SELECT } from '@/constants/meme'
import { prismaClient } from '@/db'
import { serverEnv } from '@/env/server'
import {
  CONTENT_LOCALE_TO_LOCALE,
  LOCALE_META,
  REQUIRED_TRANSLATION_LOCALES,
  resolveMemeTranslation
} from '@/helpers/i18n-content'
import { withTimeout } from '@/helpers/promise'
import { buildSignedOriginalUrl } from '@/lib/bunny'
import { adminLogger } from '@/lib/logger'
import { captureWithFeature } from '@/lib/sentry'
import type { Locale } from '@/paraglide/runtime'
import { adminRequiredMiddleware } from '@/server/user-auth'
import {
  createPartFromUri,
  createUserContent,
  FileState,
  GoogleGenAI
} from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'

const translationSchema = z.object({
  description: z
    .string()
    .describe(
      'La description de la vidéo, utile pour le SEO (200 caractères maximum)'
    ),
  keywords: z.array(z.string()).describe('Mots clefs de la vidéo')
})

const ai = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY })

const GEMINI_MODEL = 'gemini-3-flash-preview'
const GEMINI_TIMEOUT_MS = 30_000
const GEMINI_FILE_POLL_INTERVAL_MS = 2_000
const GEMINI_FILE_MAX_RETRIES = 15

async function waitForFileActive(fileName: string) {
  let retries = 0

  while (retries < GEMINI_FILE_MAX_RETRIES) {
    // eslint-disable-next-line no-await-in-loop -- sequential polling required
    const file = await ai.files.get({ name: fileName })

    if (file.state === FileState.ACTIVE) {
      return file
    }

    if (file.state === FileState.FAILED) {
      throw new Error(`Gemini file processing failed: ${fileName}`)
    }

    retries += 1

    // eslint-disable-next-line no-await-in-loop -- intentional delay between polls
    await new Promise((resolve) => {
      setTimeout(resolve, GEMINI_FILE_POLL_INTERVAL_MS)
    })
  }

  throw new Error(
    `Gemini file not ACTIVE after ${GEMINI_FILE_MAX_RETRIES} retries: ${fileName}`
  )
}

function buildResponseSchema(targetLocales: readonly Locale[]) {
  return z.object(
    Object.fromEntries(
      targetLocales.map((locale) => {
        return [locale, translationSchema]
      })
    ) as Record<Locale, typeof translationSchema>
  )
}

function buildPrompt(title: string, targetLocales: readonly Locale[]) {
  const localeInstructions = targetLocales
    .map((locale) => {
      const { label } = LOCALE_META[locale]
      const prefix =
        locale === 'fr'
          ? `Cela doit toujours commencer par : "Découvrez et téléchargez ce mème de [ta mini description de 150 caractères grand grand max]`
          : `It must always start with: "Discover and download this meme of [your mini description of 150 characters max]`

      return `- "${locale}" (${label}): description en ${label} (150 caractères max). ${prefix}`
    })
    .join('\n')

  return `Cette vidéo est un mème. Le titre de la vidéo est "${title}".
Que se passe-t-il dans cette vidéo ? Le mème est surement populaire. Cherche pourquoi.

Pour chaque langue ci-dessous, génère une description SEO courte et des mots-clefs pertinents DANS CETTE LANGUE :
${localeInstructions}

Les mots-clefs doivent être dans la langue correspondante.`
}

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

    const targetLocales = REQUIRED_TRANSLATION_LOCALES[meme.contentLocale]
    const responseSchema = buildResponseSchema(targetLocales)

    const originalUrl = await buildSignedOriginalUrl(meme.video.bunnyId)
    const videoResponse = await fetch(originalUrl)

    if (!videoResponse.ok) {
      setResponseStatus(502)
      throw new Error(
        `Impossible de récupérer la vidéo depuis Bunny (${videoResponse.status})`
      )
    }

    const videoBlob = await videoResponse.blob()
    const uploadedFile = await ai.files.upload({
      file: videoBlob,
      config: { mimeType: 'video/mp4' }
    })

    if (!uploadedFile.name || !uploadedFile.mimeType) {
      setResponseStatus(502)
      throw new Error('Upload Gemini Files API échoué : fichier invalide')
    }

    try {
      const activeFile = await waitForFileActive(uploadedFile.name)

      if (!activeFile.uri) {
        setResponseStatus(502)
        throw new Error('Upload Gemini Files API échoué : URI manquante')
      }

      const result = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: createUserContent([
            createPartFromUri(activeFile.uri, uploadedFile.mimeType),
            buildPrompt(resolved.title, targetLocales)
          ]),
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: zodToJsonSchema(responseSchema)
          }
        }),
        GEMINI_TIMEOUT_MS,
        `Génération AI : timeout après ${GEMINI_TIMEOUT_MS}ms`
      )

      if (!result.text) {
        setResponseStatus(502)
        throw new Error('La génération AI a échoué : réponse vide')
      }

      const parsed = responseSchema.parse(JSON.parse(result.text))

      adminLogger.info(
        { memeId: data.memeId, locales: targetLocales },
        'AI content generated'
      )

      return parsed
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      captureWithFeature(error, 'ai-generation')
      adminLogger.error(
        { err: error, memeId: data.memeId, message },
        'AI content generation failed'
      )
      setResponseStatus(502)
      throw new Error(`La génération AI a échoué : ${message}`)
    } finally {
      ai.files.delete({ name: uploadedFile.name }).catch((error: unknown) => {
        adminLogger.error(
          { err: error, fileName: uploadedFile.name },
          'Failed to cleanup Gemini file'
        )
      })
    }
  })

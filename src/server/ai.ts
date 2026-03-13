import { z } from 'zod/v3'
import zodToJsonSchema from 'zod-to-json-schema'
import { MEME_TRANSLATION_SELECT } from '@/constants/meme'
import { prismaClient } from '@/db'
import { serverEnv } from '@/env/server'
import { getErrorMessage } from '@/helpers/error'
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
import { type Locale, locales } from '@/paraglide/runtime'
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

function buildLocalizedResponseSchema<T extends z.ZodTypeAny>(
  targetLocales: readonly Locale[],
  itemSchema: T
) {
  return z.object(
    Object.fromEntries(
      targetLocales.map((locale) => {
        return [locale, itemSchema]
      })
    ) as Record<Locale, T>
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

const memeTranslateResultSchema = translationSchema.extend({
  title: z.string().describe('Titre traduit (100 caractères max)')
})

type BuildTranslatePromptParams = {
  sourceLabel: string
  targetLocales: readonly Locale[]
  title: string
  description: string
  keywords: string[]
}

function buildTranslatePrompt({
  sourceLabel,
  targetLocales,
  title,
  description,
  keywords
}: BuildTranslatePromptParams) {
  const targetInstructions = targetLocales
    .map((locale) => {
      return `- "${locale}" (${LOCALE_META[locale].label})`
    })
    .join('\n')

  return `Tu es un traducteur professionnel spécialisé dans le contenu web et le SEO.

Traduis les métadonnées suivantes d'un mème de ${sourceLabel} vers les langues indiquées.

Titre : "${title}"
Description : "${description}"
Mots-clés : ${keywords.join(', ')}

Langues cibles :
${targetInstructions}

Règles :
- Conserve le même ton et style
- Titre : 100 caractères maximum
- Description : 200 caractères maximum
- Si la description commence par "Découvrez et téléchargez ce mème de...", adapte le préfixe naturellement ("Discover and download this meme of...")
- Traduis chaque mot-clé individuellement
- Les mots-clés doivent être en minuscules
- Adapte les expressions idiomatiques à la langue cible`
}

export const translateMemeContent = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
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
    const sourceLabel = LOCALE_META[data.sourceLocale].label
    const responseSchema = buildLocalizedResponseSchema(
      data.targetLocales,
      memeTranslateResultSchema
    )
    const prompt = buildTranslatePrompt({
      sourceLabel,
      targetLocales: data.targetLocales,
      title: data.title,
      description: data.description,
      keywords: data.keywords
    })

    try {
      const result = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: zodToJsonSchema(responseSchema)
          }
        }),
        GEMINI_TIMEOUT_MS,
        `Traduction AI : timeout après ${GEMINI_TIMEOUT_MS}ms`
      )

      if (!result.text) {
        setResponseStatus(502)
        throw new Error('La traduction AI a échoué : réponse vide')
      }

      const parsed = responseSchema.parse(JSON.parse(result.text))

      adminLogger.info(
        { sourceLocale: data.sourceLocale, targetLocales: data.targetLocales },
        'AI translation completed'
      )

      return parsed
    } catch (error) {
      captureWithFeature(error, 'ai-translation')
      adminLogger.error(
        { err: error, sourceLocale: data.sourceLocale },
        'AI translation failed'
      )
      setResponseStatus(502)
      throw new Error(`La traduction AI a échoué : ${getErrorMessage(error)}`)
    }
  })

export const generateMemeContent = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return z
      .object({
        memeId: z.string(),
        title: z.string().optional(),
        targetLocales: z.array(z.enum(locales)).min(1).optional()
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

    const effectiveTitle = data.title ?? resolved.title

    const targetLocales =
      data.targetLocales ?? REQUIRED_TRANSLATION_LOCALES[meme.contentLocale]
    const responseSchema = buildLocalizedResponseSchema(
      targetLocales,
      translationSchema
    )

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
            buildPrompt(effectiveTitle, targetLocales)
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
      captureWithFeature(error, 'ai-generation')
      adminLogger.error(
        { err: error, memeId: data.memeId },
        'AI content generation failed'
      )
      setResponseStatus(502)
      throw new Error(`La génération AI a échoué : ${getErrorMessage(error)}`)
    } finally {
      ai.files.delete({ name: uploadedFile.name }).catch((error: unknown) => {
        adminLogger.error(
          { err: error, fileName: uploadedFile.name },
          'Failed to cleanup Gemini file'
        )
      })
    }
  })

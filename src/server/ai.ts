import { z } from 'zod'
import { FileState, GoogleGenAI, type Interactions } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { prismaClient } from '~/db'
import { HTTP_STATUS } from '~/constants/http'
import { serverEnv } from '~/env/server'
import { getErrorMessage } from '~/helpers/error'
import { LOCALE_META } from '~/helpers/i18n-content'
import { buildSignedOriginalUrl } from '~/lib/bunny'
import { adminLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { type Locale, locales } from '~/paraglide/runtime'
import { adminRequiredMiddleware } from '~/server/user-auth'

const CUSTOM_PROMPT_MAX_LENGTH = 500

const DESCRIPTION_PREFIX = {
  fr: 'Découvrez et téléchargez ce mème de',
  en: 'Discover and download this meme of'
} as const satisfies Record<Locale, string>

let geminiClient: GoogleGenAI | null = null

const getGeminiClient = () => {
  geminiClient ??= new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY })

  return geminiClient
}

const GEMINI_TRANSLATION_MODEL = 'gemini-3.5-flash-lite'
const GEMINI_VIDEO_MODEL = 'gemini-3.8-flash'
const GEMINI_TIMEOUT_MS = 100_000
const GEMINI_FILE_POLL_INTERVAL_MS = 2000
const GEMINI_FILE_MAX_RETRIES = 15

async function waitForFileActive(fileName: string) {
  let retries = 0

  while (retries < GEMINI_FILE_MAX_RETRIES) {
    // oxlint-disable-next-line no-await-in-loop -- sequential polling required
    const file = await getGeminiClient().files.get({ name: fileName })

    if (file.state === FileState.ACTIVE) {
      return file
    }

    if (file.state === FileState.FAILED) {
      throw new Error(`Gemini file processing failed: ${fileName}`)
    }

    retries += 1

    // oxlint-disable-next-line no-await-in-loop -- intentional delay between polls
    await new Promise((resolve) => {
      setTimeout(resolve, GEMINI_FILE_POLL_INTERVAL_MS)
    })
  }

  throw new Error(
    `Gemini file not ACTIVE after ${GEMINI_FILE_MAX_RETRIES} retries: ${fileName}`
  )
}

const aiAssistResultSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string())
})

export type AiAssistResult = z.infer<typeof aiAssistResultSchema>

type ModelInteractionParams =
  Interactions.InteractionCreateParams.CreateModelInteractionParamsNonStreaming

type RequestGeminiJsonParams<TSchema extends z.ZodType> = Pick<
  ModelInteractionParams,
  'model' | 'input'
> & {
  thinkingLevel: NonNullable<
    ModelInteractionParams['generation_config']
  >['thinking_level']
  schema: TSchema
}

async function requestGeminiJson<TSchema extends z.ZodType>({
  model,
  input,
  thinkingLevel,
  schema
}: RequestGeminiJsonParams<TSchema>) {
  const interaction = await getGeminiClient().interactions.create(
    {
      model,
      store: false,
      input,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: z.toJSONSchema(schema, { target: 'draft-07' })
      },
      generation_config: { thinking_level: thinkingLevel }
    },
    { timeout_ms: GEMINI_TIMEOUT_MS }
  )

  if (!interaction.output_text) {
    throw new Error('réponse vide')
  }

  return schema.parse(JSON.parse(interaction.output_text))
}

type BuildAiAssistPromptParams = {
  customPrompt: string
  targetLocale: Locale
}

function buildAiAssistPrompt({
  customPrompt,
  targetLocale
}: BuildAiAssistPromptParams) {
  const { label } = LOCALE_META[targetLocale]
  const trimmedCustomPrompt = customPrompt.trim()
  const adminContext =
    trimmedCustomPrompt === ''
      ? ''
      : `\n\nContexte donné par l'admin : "${trimmedCustomPrompt}"`

  return `Tu écris la fiche de ce mème vidéo pour Petit Meme, en ${label}.${adminContext}

Le public a entre 15 et 35 ans : écris avec les mots simples qu'il dit à l'oral, comme « rigole », « regarde » ou « pleure ».

- title : 60 caractères au plus, au format « [qui] [action] - [source] ». Qui : le personnage ou l'acteur. Source : le film, la série ou l'émission, quand il y en a une. Exemples : « Tobey Maguire qui rigole - Spider-Man 3 », « Chat qui fixe la caméra », « Pedro Pascal qui pleure puis rit ».
- description : 200 caractères au plus. Elle commence par « ${DESCRIPTION_PREFIX[targetLocale]} », puis décrit la scène.
- keywords : 5 à 8 mots-clés en minuscules, d'un seul mot chacun (un nom propre compte pour un mot). Chaque mot-clé aide à retrouver ce mème précis et ajoute un mot absent du titre :
  - les noms propres : l'acteur, le personnage, le film ou la série ;
  - le nom du template quand tu le reconnais, comme « bully maguire » ou « drake hotline bling » ;
  - les verbes et adjectifs qu'un jeune taperait pour le chercher, comme « marrant », « rigoler », « triste » ou « choqué ».`
}

async function deleteGeminiFile(fileName: string, failureMessage: string) {
  try {
    await getGeminiClient().files.delete({ name: fileName })
  } catch (error) {
    adminLogger.error({ error, fileName }, failureMessage)
  }
}

async function uploadVideoToGemini(memeId: string) {
  const meme = await prismaClient.meme.findUnique({
    where: { id: memeId },
    include: { video: true }
  })

  if (!meme) {
    adminLogger.warn({ memeId }, 'Meme not found for AI generation')
    setResponseStatus(HTTP_STATUS.NOT_FOUND)
    throw new Error('Mème introuvable')
  }

  const originalUrl = await buildSignedOriginalUrl(meme.video.bunnyId)
  const videoResponse = await fetch(originalUrl)

  if (!videoResponse.ok) {
    setResponseStatus(HTTP_STATUS.BAD_GATEWAY)
    throw new Error(
      `Impossible de récupérer la vidéo depuis Bunny (${videoResponse.status})`
    )
  }

  const videoBlob = await videoResponse.blob()
  const uploadedFile = await getGeminiClient().files.upload({
    file: videoBlob,
    config: { mimeType: 'video/mp4' }
  })

  if (!uploadedFile.name || !uploadedFile.mimeType) {
    setResponseStatus(HTTP_STATUS.BAD_GATEWAY)
    throw new Error('Upload Gemini Files API échoué : fichier invalide')
  }

  try {
    const activeFile = await waitForFileActive(uploadedFile.name)

    if (!activeFile.uri) {
      setResponseStatus(HTTP_STATUS.BAD_GATEWAY)
      throw new Error('Upload Gemini Files API échoué : URI manquante')
    }

    return {
      fileUri: activeFile.uri,
      fileMimeType: uploadedFile.mimeType,
      fileName: uploadedFile.name
    }
  } catch (error) {
    void deleteGeminiFile(
      uploadedFile.name,
      'Failed to cleanup Gemini file after upload error'
    )
    throw error
  }
}

const memeTranslateResultSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string())
})

const LOCALIZED_TRANSLATION_SCHEMA = z.object({
  fr: memeTranslateResultSchema,
  en: memeTranslateResultSchema
} satisfies Record<Locale, typeof memeTranslateResultSchema>)

function buildTranslationResponseSchema(targetLocales: readonly Locale[]) {
  const targetLocalesMask: Partial<Record<Locale, true>> = Object.fromEntries(
    targetLocales.map((locale) => {
      return [locale, true]
    })
  )

  return LOCALIZED_TRANSLATION_SCHEMA.pick(targetLocalesMask)
}

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
  const targetLanguages = targetLocales
    .map((locale) => {
      return `- "${locale}" : ${LOCALE_META[locale].label}`
    })
    .join('\n')

  return `Traduis la fiche d'un mème, écrite en ${sourceLabel}, vers chaque langue cible. Garde le ton de l'original, et remplace chaque expression par celle qu'on dit vraiment dans la langue cible.

Langues cibles, une entrée par clé :
${targetLanguages}

- title : 100 caractères au plus.
- description : 200 caractères au plus. Son préfixe suit la langue : « ${DESCRIPTION_PREFIX.fr} » en français, « ${DESCRIPTION_PREFIX.en} » en anglais.
- keywords : chaque mot-clé traduit séparément, en minuscules.

Titre : "${title}"
Description : "${description}"
Mots-clés : ${keywords.join(', ')}`
}

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
    const sourceLabel = LOCALE_META[data.sourceLocale].label
    const responseSchema = buildTranslationResponseSchema(data.targetLocales)
    const prompt = buildTranslatePrompt({
      sourceLabel,
      targetLocales: data.targetLocales,
      title: data.title,
      description: data.description,
      keywords: data.keywords
    })

    try {
      const parsed = await requestGeminiJson({
        model: GEMINI_TRANSLATION_MODEL,
        input: prompt,
        thinkingLevel: 'minimal',
        schema: responseSchema
      })

      adminLogger.info(
        { sourceLocale: data.sourceLocale, targetLocales: data.targetLocales },
        'AI translation completed'
      )

      return parsed
    } catch (error) {
      captureWithFeature(error, 'ai-translation')
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
    const { fileUri, fileMimeType, fileName } = await uploadVideoToGemini(
      data.memeId
    )

    try {
      const prompt = buildAiAssistPrompt({
        customPrompt: data.customPrompt,
        targetLocale: data.targetLocale
      })

      const parsed = await requestGeminiJson({
        model: GEMINI_VIDEO_MODEL,
        input: [
          { type: 'video', uri: fileUri, mime_type: fileMimeType },
          { type: 'text', text: prompt }
        ],
        thinkingLevel: 'low',
        schema: aiAssistResultSchema
      })

      adminLogger.info(
        { memeId: data.memeId, targetLocale: data.targetLocale },
        'AI assist content generated'
      )

      return parsed
    } catch (error) {
      captureWithFeature(error, 'ai-generation')
      adminLogger.error(
        { error, memeId: data.memeId },
        'AI assist content generation failed'
      )
      setResponseStatus(HTTP_STATUS.BAD_GATEWAY)
      throw new Error(`AI Assist a échoué : ${getErrorMessage(error)}`, {
        cause: error
      })
    } finally {
      void deleteGeminiFile(fileName, 'Failed to cleanup Gemini file')
    }
  })

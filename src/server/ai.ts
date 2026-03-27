import { z } from 'zod/v3'
import zodToJsonSchema from 'zod-to-json-schema'
import { prismaClient } from '~/db'
import { serverEnv } from '~/env/server'
import { getErrorMessage } from '~/helpers/error'
import { LOCALE_META } from '~/helpers/i18n-content'
import { withTimeout } from '~/helpers/promise'
import { buildSignedOriginalUrl } from '~/lib/bunny'
import { adminLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'
import { type Locale, locales } from '~/paraglide/runtime'
import { adminRequiredMiddleware } from '~/server/user-auth'
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
const GEMINI_TIMEOUT_MS = 45_000
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

const aiAssistResultSchema = z.object({
  title: z
    .string()
    .describe(
      'Titre court (60 caractères max). Format : "[Qui] [action] - [source]". Qui = personnage ou acteur. Source = film, série, émission si applicable. Langage simple de jeune 15-35 ans, jamais de mots soutenus (pas "s\'esclaffe", "contemple" → "rigole", "regarde"). JAMAIS "mème", "trend", "template". Ex: "Tobey Maguire qui rigole - Spider-Man 3"'
    ),
  description: z
    .string()
    .describe(
      'Description SEO (200 caractères max, commence par "Découvrez et téléchargez ce mème de [mini description]")'
    ),
  keywords: z
    .array(z.string())
    .describe(
      'Mots-clés de recherche, 1 mot chacun. Même langue que le titre. Public jeune 15-35 ans. Catégories : (1) noms propres (acteur, personnage, film/série — pas de franchise générique comme "marvel"), (2) nom du template mème si connu, (3) verbes ou adjectifs simples en 1 mot (ex: "marrant", "rigoler", "triste", "choqué"). JAMAIS de groupes de mots ("fou rire", "trop drôle", "mort de rire"). JAMAIS de mots génériques (cinéma, réaction, costume, scène). JAMAIS de doublons sémantiques. JAMAIS répéter un mot du titre. 5-8 max.'
    )
})

export type AiAssistResult = z.infer<typeof aiAssistResultSchema>

type BuildAiAssistPromptParams = {
  customPrompt: string
  targetLocale: Locale
}

function buildAiAssistPrompt({
  customPrompt,
  targetLocale
}: BuildAiAssistPromptParams) {
  const { label } = LOCALE_META[targetLocale]
  const descriptionPrefix =
    targetLocale === 'fr'
      ? 'Découvrez et téléchargez ce mème de'
      : 'Discover and download this meme of'

  const contextBlock = customPrompt.trim()
    ? `\nContexte fourni par l'admin : "${customPrompt.trim()}"\n`
    : ''

  return `Tu es un expert en mèmes internet et en SEO.

Analyse cette vidéo de mème.${contextBlock}
Génère en ${label} :
1. Un titre court (60 caractères max). Format : "[Qui] [action] - [source]". Qui = personnage ou acteur. Action = verbe simple (rigole, pleure, regarde, danse...). Source = film, série, émission si applicable. Langage de jeune 15-35 ans, JAMAIS de mots soutenus (pas "s'esclaffe", "contemple"). JAMAIS "mème", "trend", "template". Ex: "Tobey Maguire qui rigole - Spider-Man 3", "Chat qui fixe la caméra", "Pedro Pascal qui pleure puis rit"
2. Une description SEO courte (200 caractères max). Elle doit commencer par : "${descriptionPrefix} [ta mini description de 150 caractères max]"
3. 5-8 mots-clés de recherche en minuscules. TOUS dans la même langue que le reste. Chaque mot-clé = 1 SEUL mot (sauf noms propres composés). Catégories :
   - Noms propres : acteur, personnage, film/série (pas de franchise générique comme "marvel")
   - Nom du template mème si connu (ex: "bully maguire", "drake hotline bling")
   - Verbes ou adjectifs simples en 1 mot que des jeunes 15-35 ans taperaient (ex: "marrant", "rigoler", "triste", "choqué")
   INTERDIT : groupes de mots ("fou rire", "trop drôle", "mort de rire"), mots génériques (cinéma, réaction, costume, scène), mots soutenus/littéraires, doublons sémantiques, mots déjà dans le titre.

Identifie le template/la référence si possible.`
}

async function uploadVideoToGemini(memeId: string) {
  const meme = await prismaClient.meme.findUnique({
    where: { id: memeId },
    include: { video: true }
  })

  if (!meme) {
    adminLogger.warn({ memeId }, 'Meme not found for AI generation')
    setResponseStatus(404)
    throw new Error('Mème introuvable')
  }

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

    return {
      fileUri: activeFile.uri,
      fileMimeType: uploadedFile.mimeType,
      fileName: uploadedFile.name
    }
  } catch (error) {
    ai.files
      .delete({ name: uploadedFile.name })
      .catch((deleteError: unknown) => {
        adminLogger.error(
          { err: deleteError, fileName: uploadedFile.name },
          'Failed to cleanup Gemini file after upload error'
        )
      })
    throw error
  }
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

export const aiAssistMemeContent = createServerFn({ method: 'POST' })
  .middleware([adminRequiredMiddleware])
  .inputValidator((data) => {
    return z
      .object({
        memeId: z.string().cuid(),
        customPrompt: z.string().max(500),
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

      const result = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: createUserContent([
            createPartFromUri(fileUri, fileMimeType),
            prompt
          ]),
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: zodToJsonSchema(aiAssistResultSchema)
          }
        }),
        GEMINI_TIMEOUT_MS,
        `AI Assist : timeout après ${GEMINI_TIMEOUT_MS}ms`
      )

      if (!result.text) {
        setResponseStatus(502)
        throw new Error('AI Assist a échoué : réponse vide')
      }

      const parsed = aiAssistResultSchema.parse(JSON.parse(result.text))

      adminLogger.info(
        { memeId: data.memeId, targetLocale: data.targetLocale },
        'AI assist content generated'
      )

      return parsed
    } catch (error) {
      captureWithFeature(error, 'ai-generation')
      adminLogger.error(
        { err: error, memeId: data.memeId },
        'AI assist content generation failed'
      )
      setResponseStatus(502)
      throw new Error(`AI Assist a échoué : ${getErrorMessage(error)}`)
    } finally {
      ai.files.delete({ name: fileName }).catch((error: unknown) => {
        adminLogger.error(
          { err: error, fileName },
          'Failed to cleanup Gemini file'
        )
      })
    }
  })

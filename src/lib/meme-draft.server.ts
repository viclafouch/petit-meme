import { z } from 'zod'
import { MediaResolution } from '@google/genai'
import { chat, deleteFile } from '@tanstack/ai'
import {
  createGeminiChat,
  createGeminiFiles,
  geminiVideoPart,
  type GeminiTextConfig,
  type GeminiUploadedFile,
  uploadGeminiFile
} from '@tanstack/ai-gemini'
import { googleSearchTool } from '@tanstack/ai-gemini/tools'
import { HTTP_STATUS } from '~/constants/http'
import { MemeContentLocale } from '~/db/generated/prisma/enums'
import { serverEnv } from '~/env/server.server'
import { LOCALE_META } from '~/helpers/i18n-content'
import { withTimeout } from '~/helpers/promise'
import { fetchOriginalVideo } from '~/lib/bunny.server'
import { aiLogger } from '~/lib/logger'
import type { Locale } from '~/paraglide/runtime'

const GEMINI_VIDEO_MODEL = 'gemini-3.8-flash'
const GEMINI_TRANSLATION_MODEL = 'gemini-3.5-flash-lite'
const GEMINI_VIDEO_FPS = 2
const GEMINI_FILE_POLL_INTERVAL_MS = 2000

const GEMINI_CLIENT_CONFIG = {
  httpOptions: {
    retryOptions: {
      attempts: 5,
      httpStatusCodes: [
        HTTP_STATUS.REQUEST_TIMEOUT,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        HTTP_STATUS.BAD_GATEWAY,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        HTTP_STATUS.GATEWAY_TIMEOUT
      ]
    }
  }
} as const satisfies Omit<GeminiTextConfig, 'apiKey'>

const MEME_DRAFT_KEYWORDS_MIN = 5
const MEME_DRAFT_KEYWORDS_MAX = 8
const MEME_DRAFT_CATEGORIES_MAX = 3

export const MEME_DRAFT_LOCALE = 'fr' as const satisfies Locale

const DESCRIPTION_PREFIX = {
  fr: 'Découvrez et téléchargez ce mème de',
  en: 'Discover and download this meme of'
} as const satisfies Record<Locale, string>

const memeDraftSchema = z.object({
  title: z
    .string()
    .describe('Titre du mème, au format « [accroche] - [source] »'),
  source: z
    .string()
    .describe(
      'L’émission, le film, la série, la personne à l’écran ou l’origine de la vidéo'
    ),
  description: z
    .string()
    .describe('Description de la scène, de ce qu’on y voit et entend'),
  keywords: z
    .array(z.string().describe('Un mot-clé en minuscules, d’un seul mot'))
    .min(MEME_DRAFT_KEYWORDS_MIN)
    .max(MEME_DRAFT_KEYWORDS_MAX)
    .describe('Mots-clés pour retrouver ce mème précis'),
  contentLocale: z
    .enum(MemeContentLocale)
    .describe('La langue dont le mème a besoin pour être compris'),
  categorySlugs: z
    .array(z.string())
    .max(MEME_DRAFT_CATEGORIES_MAX)
    .describe('Les slugs des catégories du mème, pris dans la liste donnée'),
  doubt: z
    .string()
    .describe('Ce dont tu n’es pas sûr, vide quand tu es sûr de tout')
})

export type MemeDraft = z.infer<typeof memeDraftSchema>

type MemeDraftCategory = {
  slug: string
  title: string
}

function buildCategoriesRule(categories: MemeDraftCategory[]) {
  if (categories.length === 0) {
    return '- categorySlugs : toujours vide.'
  }

  const categoryLines = categories
    .map(({ slug, title }) => {
      return `  - ${slug} : ${title}`
    })
    .join('\n')

  return `- categorySlugs : 0 à ${MEME_DRAFT_CATEGORIES_MAX} slugs pris dans cette liste, seulement ceux qui décrivent vraiment le mème :\n${categoryLines}`
}

type BuildMemeDraftPromptParams = {
  customPrompt: string
  targetLocale: Locale
  categories: MemeDraftCategory[]
}

function buildMemeDraftPrompt({
  customPrompt,
  targetLocale,
  categories
}: BuildMemeDraftPromptParams) {
  const { label } = LOCALE_META[targetLocale]
  const trimmedCustomPrompt = customPrompt.trim()
  const adminContext =
    trimmedCustomPrompt === ''
      ? ''
      : `\n\nContexte donné par l'admin : "${trimmedCustomPrompt}"`

  return `Tu écris la fiche de ce mème vidéo pour Petit Meme, en ${label}.${adminContext}

Regarde l'image et écoute le son en entier, jusqu'à la dernière seconde. Cherche sur Google pour confirmer qui parle, d'où vient l'extrait, et si la réplique entendue est connue.

Le public a entre 15 et 35 ans : écris avec les mots simples qu'il dit à l'oral, comme « rigole », « regarde » ou « pleure ».

- title : 60 caractères au plus, toujours au format « [accroche] - [source] ».
  - L'accroche est la réplique culte dès que quelqu'un en dit une, même courte, même à moitié audible : c'est elle que les gens tapent pour retrouver le mème. Garde ses mots exacts, sans guillemets. Exemple : « Mon sperme ne t'a pas suffi ?! - Le jour où tout a basculé ».
  - Sans réplique marquante, l'accroche dit qui fait quoi. Exemples : « Tobey Maguire qui rigole - Spider-Man 3 », « Chat qui fixe la caméra - TikTok ».
  - La partie après « - » reprend le champ source, mot pour mot.
- source : jamais vide. Prends la première qui s'applique : l'émission, le film, la série ou le jeu ; sinon la personne connue à l'écran ou l'auteur de la vidéo ; sinon la plateforme ou le contexte d'origine, comme « TikTok », « Twitch » ou « Vidéo amateur ». Quand la source est une supposition, dis-le dans doubt.
- description : 200 caractères au plus. Elle commence par « ${DESCRIPTION_PREFIX[targetLocale]} », puis décrit la scène : ce qu'on voit, et la réplique entendue quand il y en a une.
- keywords : ${MEME_DRAFT_KEYWORDS_MIN} à ${MEME_DRAFT_KEYWORDS_MAX} mots-clés en minuscules, d'un seul mot chacun (un nom propre compte pour un mot). Chaque mot-clé aide à retrouver ce mème précis et ajoute un mot absent du titre :
  - les noms propres : l'acteur, le personnage, le film, la série ou l'émission ;
  - le nom du template quand tu le reconnais, comme « bully maguire » ou « drake hotline bling » ;
  - les verbes et adjectifs qu'un jeune taperait pour le chercher, comme « marrant », « rigoler », « triste » ou « choqué ».
- contentLocale : UNIVERSAL quand ni la parole ni le texte à l'écran ne comptent pour comprendre le mème. Sinon la langue parlée : FR pour le français, EN pour l'anglais.
${buildCategoriesRule(categories)}
- doubt : une phrase courte sur ce dont tu n'es pas sûr, vide quand tu es sûr de tout. Dans le doute sur la langue, choisis la langue parlée et dis-le ici.`
}

export async function fetchMemeVideo(bunnyId: string) {
  const videoResponse = await fetchOriginalVideo(bunnyId)

  if (videoResponse.status === HTTP_STATUS.NOT_FOUND) {
    return null
  }

  if (!videoResponse.ok) {
    throw new Error(
      `Impossible de récupérer la vidéo depuis Bunny (${videoResponse.status})`
    )
  }

  return videoResponse.blob()
}

type WriteMemeDraftParams = BuildMemeDraftPromptParams & {
  video: Blob
  timeoutMs: number
}

async function deleteGeminiFile(file: GeminiUploadedFile) {
  try {
    await deleteFile({
      adapter: createGeminiFiles(serverEnv.GEMINI_API_KEY),
      id: file.name
    })
  } catch (error) {
    aiLogger.error(
      { error, fileName: file.name },
      'Failed to delete the Gemini file'
    )
  }
}

export async function writeMemeDraft({
  video,
  timeoutMs,
  ...promptParams
}: WriteMemeDraftParams) {
  return withTimeout(
    async (abortController) => {
      const geminiFile = await uploadGeminiFile(video, {
        apiKey: serverEnv.GEMINI_API_KEY,
        mimeType: 'video/mp4',
        pollIntervalMs: GEMINI_FILE_POLL_INTERVAL_MS,
        abortSignal: abortController.signal
      })

      try {
        return await chat({
          adapter: createGeminiChat(
            GEMINI_VIDEO_MODEL,
            serverEnv.GEMINI_API_KEY,
            GEMINI_CLIENT_CONFIG
          ),
          messages: [
            {
              role: 'user',
              content: [
                geminiVideoPart(geminiFile, { fps: GEMINI_VIDEO_FPS }),
                { type: 'text', content: buildMemeDraftPrompt(promptParams) }
              ]
            }
          ],
          threadId: crypto.randomUUID(),
          tools: [googleSearchTool()],
          reasoning: 'medium',
          modelOptions: {
            mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH
          },
          outputSchema: memeDraftSchema,
          abortController
        })
      } finally {
        void deleteGeminiFile(geminiFile)
      }
    },
    timeoutMs,
    'Gemini n’a pas écrit la fiche à temps'
  )
}

const memeTranslationSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string())
})

export type MemeDraftTranslation = z.infer<typeof memeTranslationSchema>

const LOCALIZED_TRANSLATION_SCHEMA = z.object({
  fr: memeTranslationSchema,
  en: memeTranslationSchema
} satisfies Record<Locale, typeof memeTranslationSchema>)

function buildTranslationResponseSchema(targetLocales: readonly Locale[]) {
  const targetLocalesMask: Partial<Record<Locale, true>> = Object.fromEntries(
    targetLocales.map((locale) => {
      return [locale, true]
    })
  )

  return LOCALIZED_TRANSLATION_SCHEMA.pick(targetLocalesMask)
}

type TranslateMemeDraftParams = {
  sourceLocale: Locale
  targetLocales: readonly Locale[]
  title: string
  description: string
  keywords: string[]
  timeoutMs: number
}

function buildTranslatePrompt({
  sourceLocale,
  targetLocales,
  title,
  description,
  keywords
}: Omit<TranslateMemeDraftParams, 'timeoutMs'>) {
  const targetLanguages = targetLocales
    .map((locale) => {
      return `- "${locale}" : ${LOCALE_META[locale].label}`
    })
    .join('\n')

  return `Traduis la fiche d'un mème, écrite en ${LOCALE_META[sourceLocale].label}, vers chaque langue cible. Garde le ton de l'original, et remplace chaque expression par celle qu'on dit vraiment dans la langue cible.

Langues cibles, une entrée par clé :
${targetLanguages}

- title : 100 caractères au plus.
- description : 200 caractères au plus. Son préfixe suit la langue : « ${DESCRIPTION_PREFIX.fr} » en français, « ${DESCRIPTION_PREFIX.en} » en anglais.
- keywords : chaque mot-clé traduit séparément, en minuscules.

Titre : "${title}"
Description : "${description}"
Mots-clés : ${keywords.join(', ')}`
}

export async function translateMemeDraft({
  timeoutMs,
  ...translation
}: TranslateMemeDraftParams) {
  return withTimeout(
    (abortController) => {
      return chat({
        adapter: createGeminiChat(
          GEMINI_TRANSLATION_MODEL,
          serverEnv.GEMINI_API_KEY,
          GEMINI_CLIENT_CONFIG
        ),
        messages: [
          { role: 'user', content: buildTranslatePrompt(translation) }
        ],
        threadId: crypto.randomUUID(),
        reasoning: 'minimal',
        outputSchema: buildTranslationResponseSchema(translation.targetLocales),
        abortController
      })
    },
    timeoutMs,
    'Gemini n’a pas traduit la fiche à temps'
  )
}

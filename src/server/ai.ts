import { z } from 'zod/v3'
import zodToJsonSchema from 'zod-to-json-schema'
import { ENV } from '@/constants/env'
import { prismaClient } from '@/db'
import { getVideoPlayData } from '@/lib/bunny'
import { adminRequiredMiddleware } from '@/server/user-auth'
import { GoogleGenAI } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'

const videoSchema = z.object({
  description: z
    .string()
    .describe(
      "La description de la vidéo, utile pour le SEO en expliquant que c'est un mème (200 caractères maximum)"
    ),
  keywords: z.array(z.string()).describe('Mots clefs de la vidéo')
})

const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY })

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
        video: true
      }
    })

    if (!meme) {
      throw new Error('Meme not found')
    }

    const { originalUrl } = await getVideoPlayData({ data: meme.video.bunnyId })

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
            text: `Cette vidéo est un mème. Le titre de la vidéo est "${meme.title}". En français, que se passe-t-il dans cette vidéo ? Donne moi une description pertinente courte pour le SEO et les moteurs de recherche. Ta réponse ne doit intégrer que la description exacte (150 caractères grand maximum) de la vidéo en expliquant que c'est un mème. Le mème est surement populaire. Cherche pourquoi. Cela doit toujours commencer par : "Découvrez et téléchargez ce mème de [ta mini description de 150 caractères grand grand max]`
          }
        ]
      }
    ]

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: zodToJsonSchema(videoSchema)
      }
    })

    return videoSchema.parse(JSON.parse(result.text!))
  })

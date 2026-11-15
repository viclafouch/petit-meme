import { prismaClient } from '~/db/client.server'
import { MemeStatus } from '~/db/generated/prisma/enums'

export const findPublishedMeme = (memeId: string) => {
  return prismaClient.meme.findFirst({
    where: { id: memeId, status: MemeStatus.PUBLISHED },
    select: {
      title: true,
      description: true,
      contentLocale: true,
      translations: {
        select: { locale: true, title: true, description: true }
      },
      video: { select: { bunnyId: true } }
    }
  })
}

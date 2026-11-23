import type { Prisma } from '~/db/generated/prisma/client'
import { MemeStatus } from '~/db/generated/prisma/enums'

export const buildVisibleBookmarksWhere = (userId: string) => {
  return {
    userId,
    meme: { status: MemeStatus.PUBLISHED }
  } as const satisfies Prisma.BookmarkWhereInput
}

import { queryOptions } from '@tanstack/react-query'
import { PRIVATE_QUERY_META } from '~/constants/query'
import type { Meme } from '~/db/generated/prisma/client'
import { getAdminMemeFill } from '~/server/admin/ai-assist/ai-assist.functions'

export const getAdminMemeFillQueryOpts = (memeId: Meme['id']) => {
  return queryOptions({
    queryKey: [...getAdminMemeFillQueryOpts.all, memeId],
    meta: PRIVATE_QUERY_META,
    queryFn: () => {
      return getAdminMemeFill({ data: memeId })
    },
    staleTime: Infinity
  })
}

getAdminMemeFillQueryOpts.all = ['admin-meme-fill'] as const

import type { MemesSort } from '~/constants/meme'

type ResolveMemesSortParams = {
  sort?: MemesSort | undefined
  query?: string | undefined
}

export const resolveMemesSort = ({
  sort,
  query
}: ResolveMemesSortParams): MemesSort => {
  const defaultSort = query ? 'relevance' : 'trending'

  if (sort === 'relevance' || sort === 'trending') {
    return defaultSort
  }

  return sort ?? defaultSort
}

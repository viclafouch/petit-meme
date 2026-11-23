import { ALL_CATEGORY_SLUG, type MemesSort } from '~/constants/meme'

type ResolveMemesSortParams = {
  sort?: MemesSort | undefined
  query?: string | undefined
  category?: string | undefined
}

const resolveDefaultMemesSort = ({
  query,
  category
}: ResolveMemesSortParams): MemesSort => {
  if (query) {
    return 'relevance'
  }

  if (category) {
    return 'popular'
  }

  return 'trending'
}

export const resolveMemesSort = (params: ResolveMemesSortParams): MemesSort => {
  const defaultSort = resolveDefaultMemesSort(params)

  if (params.sort === 'relevance' || params.sort === 'trending') {
    return defaultSort
  }

  return params.sort ?? defaultSort
}

type ResolveLibraryFiltersParams = {
  slug: string
  query?: string | undefined
  sort?: MemesSort | undefined
}

export const resolveLibraryFilters = ({
  slug,
  query,
  sort
}: ResolveLibraryFiltersParams) => {
  const category = slug === ALL_CATEGORY_SLUG ? undefined : slug

  return {
    query,
    category,
    sort: resolveMemesSort({ sort, query, category })
  }
}

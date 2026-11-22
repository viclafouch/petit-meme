import { queryOptions } from '@tanstack/react-query'
import { TEN_MINUTES_MS } from '~/constants/time'
import type { Locale } from '~/paraglide/runtime'
import {
  countLibraryMemes,
  listCategories
} from '~/server/category/category.functions'

export const listCategoriesQueryOpts = (locale: Locale) => {
  return queryOptions({
    queryKey: [...listCategoriesQueryOpts.all, locale],
    queryFn: () => {
      return listCategories({ data: { locale } })
    },
    staleTime: TEN_MINUTES_MS
  })
}

listCategoriesQueryOpts.all = ['categories-list'] as const

export const countLibraryMemesQueryOpts = (locale: Locale) => {
  return queryOptions({
    queryKey: [...countLibraryMemesQueryOpts.all, locale],
    queryFn: () => {
      return countLibraryMemes({ data: { locale } })
    },
    staleTime: TEN_MINUTES_MS
  })
}

countLibraryMemesQueryOpts.all = ['library-memes-count'] as const

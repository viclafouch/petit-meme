import { CATEGORY_FAMILIES } from '~/constants/category'
import { MEMES_PER_PAGE } from '~/constants/meme'
import type { CategoryFamily } from '~/db/generated/prisma/enums'
import { sortByMemeCount } from '~/helpers/category'
import { formatCount } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import type { Locale } from '~/paraglide/runtime'
import type { listCategories } from '~/server/category/category.functions'

export type LibraryCategory = Awaited<ReturnType<typeof listCategories>>[number]

type CardsPage<TMeme extends { id: string }> = {
  memes: TMeme[]
  queryID?: string
  page: number
}

const FAMILY_TITLES = {
  MOOD: m.category_family_MOOD,
  REPLY: m.category_family_REPLY,
  THEME: m.category_family_THEME,
  SOURCE: m.category_family_SOURCE
} as const satisfies Record<CategoryFamily, () => string>

type LibraryCategoryGroup = {
  id: CategoryFamily | 'OTHER'
  title: string
  categories: LibraryCategory[]
}

export const groupByFamily = (categories: LibraryCategory[]) => {
  const families = CATEGORY_FAMILIES.map((family): LibraryCategoryGroup => {
    return {
      id: family,
      title: FAMILY_TITLES[family](),
      categories: sortByMemeCount(
        categories.filter((category) => {
          return category.family === family
        })
      )
    }
  })
  const others: LibraryCategoryGroup = {
    id: 'OTHER',
    title: m.category_family_OTHER(),
    categories: sortByMemeCount(
      categories.filter((category) => {
        return category.family === null
      })
    )
  }

  return [...families, others].filter((family) => {
    return family.categories.length > 0
  })
}

export const flattenUniqueCards = <TMeme extends { id: string }>(
  pages: CardsPage<TMeme>[]
) => {
  const seenIds = new Set<string>()

  return pages.flatMap((page) => {
    return page.memes.flatMap((meme, indexInPage) => {
      if (seenIds.has(meme.id)) {
        return []
      }

      seenIds.add(meme.id)

      return [
        {
          meme,
          queryID: page.queryID,
          position: (page.page - 1) * MEMES_PER_PAGE + indexInPage + 1
        }
      ]
    })
  })
}

const SEO_EXAMPLE_COUNT = 3

type BuildLibraryDescriptionParams = {
  categoryTitle: string | undefined
  count: number
  exampleTitles: string[]
  locale: Locale
}

export const buildLibraryDescription = ({
  categoryTitle,
  count,
  exampleTitles,
  locale
}: BuildLibraryDescriptionParams) => {
  const quotedTitles = exampleTitles
    .slice(0, SEO_EXAMPLE_COUNT)
    .map((title) => {
      return m.meme_seo_quoted_title({ title }, { locale })
    })

  if (quotedTitles.length === 0) {
    return categoryTitle
      ? m.meme_seo_category_description({ title: categoryTitle }, { locale })
      : m.meme_seo_library_description({}, { locale })
  }

  const examples = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
    quotedTitles
  )
  const formattedCount = formatCount(count, locale, 'standard')

  return categoryTitle
    ? m.meme_seo_category_examples(
        { count, formattedCount, title: categoryTitle, examples },
        { locale }
      )
    : m.meme_seo_library_examples(
        { count, formattedCount, examples },
        { locale }
      )
}

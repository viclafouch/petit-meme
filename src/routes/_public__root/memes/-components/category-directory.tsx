import React from 'react'
import { LayoutGrid } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CategoryEmojiImage } from '~/components/category/category-emoji-image'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer'
import { CATEGORY_FAMILIES } from '~/constants/category'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import type { CategoryFamily } from '~/db/generated/prisma/enums'
import { formatCount } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import {
  countLibraryMemesQueryOpts,
  listCategoriesQueryOpts
} from '~/queries/category'
import type { listCategories } from '~/server/category/category.functions'

const FAMILY_PREVIEW_COUNT = 8

const categoryRouteApi = getRouteApi('/_public__root/memes/category/$slug')

const FAMILY_TITLES = {
  MOOD: m.category_family_MOOD,
  REPLY: m.category_family_REPLY,
  THEME: m.category_family_THEME,
  SOURCE: m.category_family_SOURCE
} as const satisfies Record<CategoryFamily, () => string>

type LibraryCategory = Awaited<ReturnType<typeof listCategories>>[number]

const useLibraryCategories = () => {
  return useSuspenseQuery(listCategoriesQueryOpts(getLocale())).data
}

const useActiveSlug = () => {
  const { slug } = categoryRouteApi.useParams()
  const query = categoryRouteApi.useSearch({
    select: (search) => {
      return search.query
    }
  })

  return query ? undefined : slug
}

const sortByMemeCount = (categories: LibraryCategory[]) => {
  return categories.toSorted((first, second) => {
    return second.memeCount - first.memeCount
  })
}

type LibraryCategoryGroup = {
  id: CategoryFamily | 'OTHER'
  title: string
  categories: LibraryCategory[]
}

const groupByFamily = (categories: LibraryCategory[]) => {
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

type CategoryLinkProps = {
  slug: string
  title: string
  count: number
  isActive: boolean
  emoji?: string | null
  onNavigate?: () => void
}

const CategoryLink = ({
  slug,
  title,
  count,
  emoji,
  isActive,
  onNavigate
}: CategoryLinkProps) => {
  return (
    <Link
      to="/memes/category/$slug"
      params={{ slug }}
      search={(previous) => {
        return {
          sort: previous.sort === 'relevance' ? undefined : previous.sort
        }
      }}
      aria-current={isActive ? 'page' : undefined}
      data-empty={count === 0 || undefined}
      className="category-directory-link"
      onClick={onNavigate}
    >
      {emoji === undefined ? null : (
        <CategoryEmojiImage
          emoji={emoji}
          className="category-directory-emoji"
        />
      )}
      <span className="category-directory-label" title={title}>
        {title}
      </span>
      <span className="category-directory-count" aria-hidden="true">
        {formatCount(count, getLocale(), 'compact')}
      </span>
    </Link>
  )
}

type CategoryFamilySectionProps = {
  title: string
  categories: LibraryCategory[]
  activeSlug: string | undefined
  onNavigate?: () => void
}

const CategoryFamilySection = ({
  title,
  categories,
  activeSlug,
  onNavigate
}: CategoryFamilySectionProps) => {
  const headingId = React.useId()
  const [isExpanded, setIsExpanded] = React.useState(false)
  const activeIndex = categories.findIndex((category) => {
    return category.slug === activeSlug
  })
  const visibleCount = isExpanded
    ? categories.length
    : Math.max(FAMILY_PREVIEW_COUNT, activeIndex + 1)
  const hiddenCount = categories.length - visibleCount

  return (
    <section aria-labelledby={headingId} className="category-directory-family">
      <h2 id={headingId} className="category-directory-heading">
        {title}
      </h2>
      <ul>
        {categories.slice(0, visibleCount).map((category) => {
          return (
            <li key={category.id}>
              <CategoryLink
                slug={category.slug}
                title={category.title}
                count={category.memeCount}
                emoji={category.emoji}
                isActive={category.slug === activeSlug}
                onNavigate={onNavigate}
              />
            </li>
          )
        })}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="category-directory-more"
          onClick={() => {
            setIsExpanded(true)
          }}
        >
          {m.category_show_more({
            count: hiddenCount,
            formattedCount: formatCount(hiddenCount, getLocale(), 'standard')
          })}
        </button>
      ) : null}
    </section>
  )
}

type CategoryDirectoryProps = {
  onNavigate?: () => void
}

export const CategoryDirectory = ({ onNavigate }: CategoryDirectoryProps) => {
  const categories = useLibraryCategories()
  const totalCount = useSuspenseQuery(
    countLibraryMemesQueryOpts(getLocale())
  ).data
  const activeSlug = useActiveSlug()

  return (
    <nav aria-label={m.meme_categories_label()} className="category-directory">
      <CategoryLink
        slug={ALL_CATEGORY_SLUG}
        title={m.meme_all_memes()}
        count={totalCount}
        isActive={activeSlug === ALL_CATEGORY_SLUG}
        onNavigate={onNavigate}
      />
      {groupByFamily(categories).map((family) => {
        return (
          <CategoryFamilySection
            key={family.id}
            title={family.title}
            categories={family.categories}
            activeSlug={activeSlug}
            onNavigate={onNavigate}
          />
        )
      })}
    </nav>
  )
}

const CategoriesDrawer = () => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} showSwipeHandle>
      <DrawerTrigger className="pill pill-sm">
        <LayoutGrid aria-hidden="true" />
        {m.meme_categories_label()}
      </DrawerTrigger>
      <DrawerContent showCloseButton={false}>
        <div className="category-sheet">
          <DrawerTitle className="category-sheet-title">
            {m.meme_categories_label()}
          </DrawerTitle>
          <CategoryDirectory
            onNavigate={() => {
              setIsOpen(false)
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const centerInStrip = (item: HTMLLIElement | null) => {
  item?.scrollIntoView({
    block: 'nearest',
    inline: 'center',
    behavior: 'instant'
  })
}

export const QuickCategories = () => {
  const categories = useLibraryCategories()
  const activeSlug = useActiveSlug()
  const sortedCategories = sortByMemeCount(categories).filter((category) => {
    return category.memeCount > 0 || category.slug === activeSlug
  })

  return (
    <ul className="quick-categories" aria-label={m.meme_categories_label()}>
      <li>
        <CategoriesDrawer />
      </li>
      {sortedCategories.map((category) => {
        const isActive = category.slug === activeSlug

        return (
          <li key={category.id} ref={isActive ? centerInStrip : undefined}>
            <Link
              to="/memes/category/$slug"
              params={{ slug: isActive ? ALL_CATEGORY_SLUG : category.slug }}
              search={(previous) => {
                return {
                  sort:
                    previous.sort === 'relevance' ? undefined : previous.sort
                }
              }}
              aria-label={
                isActive
                  ? m.category_filter_clear({ title: category.title })
                  : undefined
              }
              data-active={isActive || undefined}
              className="pill pill-sm quick-category"
            >
              <CategoryEmojiImage
                emoji={category.emoji}
                className="quick-category-emoji"
              />
              {category.title}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

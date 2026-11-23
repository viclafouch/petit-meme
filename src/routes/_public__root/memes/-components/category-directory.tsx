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
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { formatCount } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import {
  countLibraryMemesQueryOpts,
  listCategoriesQueryOpts
} from '~/queries/category'
import {
  groupByFamily,
  type LibraryCategory,
  sortByMemeCount
} from '~/routes/_public__root/memes/-lib/library'

const FAMILY_PREVIEW_COUNT = 8

const categoryRouteApi = getRouteApi('/_public__root/memes/category/$slug')

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
      className="flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-color) pointer-coarse:min-h-11 data-empty:text-muted-foreground aria-[current=page]:bg-secondary aria-[current=page]:font-semibold mouse:hover:not-aria-[current=page]:bg-foreground/6"
      onClick={onNavigate}
    >
      {emoji === undefined ? null : (
        <CategoryEmojiImage emoji={emoji} className="size-5" />
      )}
      <span className="min-w-0 flex-1 truncate" title={title}>
        {title}
      </span>
      <span
        className="shrink-0 text-xs text-muted-foreground tabular-nums"
        aria-hidden="true"
      >
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
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="px-2 pb-1 text-xs font-medium text-muted-foreground"
      >
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
          className="mt-1 cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground focus-visible:focus-ring mouse:hover:text-foreground"
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
    <nav aria-label={m.meme_categories_label()} className="flex flex-col gap-5">
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
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <DrawerTitle className="font-bricolage text-lg font-semibold">
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

const revealInStrip = (item: HTMLLIElement | null) => {
  item?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
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
    <ul
      className="scrollbar-hidden -mx-3 flex scroll-px-3 gap-1.5 overflow-x-auto overscroll-x-contain px-3 py-1 sm:-mx-4 sm:px-4 [&>li]:shrink-0"
      aria-label={m.meme_categories_label()}
    >
      <li>
        <CategoriesDrawer />
      </li>
      {sortedCategories.map((category) => {
        const isActive = category.slug === activeSlug

        return (
          <li
            key={category.id}
            ref={isActive ? revealInStrip : undefined}
            className={isActive ? '[scroll-initial-target:nearest]' : undefined}
          >
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
              className="pill pill-sm data-active:bg-foreground data-active:text-background"
            >
              <CategoryEmojiImage emoji={category.emoji} className="size-4.5" />
              {category.title}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

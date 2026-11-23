import type React from 'react'
import { Outlet } from '@tanstack/react-router'
import { formatCount } from '~/helpers/number'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'
import { CategoryDirectory, QuickCategories } from './category-directory'

type LibraryHeaderProps = {
  title: string
  count?: number
  children?: React.ReactNode
}

export const LibraryHeader = ({
  title,
  count,
  children
}: LibraryHeaderProps) => {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pb-3 lg:pb-8">
      <div className="flex min-w-0 grow basis-60 flex-wrap items-baseline gap-x-3">
        <h1 className="min-w-0 font-bricolage text-xl leading-tight font-semibold tracking-tight wrap-anywhere lg:text-3xl">
          {title}
        </h1>
        {count === undefined ? null : (
          <p
            aria-live="polite"
            className="text-sm whitespace-nowrap text-muted-foreground tabular-nums"
          >
            {m.meme_library_count({
              count,
              formattedCount: formatCount(count, getLocale(), 'standard')
            })}
          </p>
        )}
      </div>
      {children}
    </header>
  )
}

export const LibraryStrip = () => {
  return (
    <div className="sticky top-(--navbar-space) z-(--z-controls) -mx-3 mb-4 bg-background px-3 py-1 sm:-mx-4 sm:px-4 lg:hidden">
      <QuickCategories />
    </div>
  )
}

export const LibraryLayout = () => {
  return (
    <div className="mx-auto w-full max-w-440 px-3 pt-5 pb-10 sm:px-4 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-[clamp(1.5rem,3vw,3rem)] lg:pt-10 lg:pb-12">
      <aside className="memes-library-sidebar max-lg:hidden">
        <CategoryDirectory />
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

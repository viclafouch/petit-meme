import { Outlet } from '@tanstack/react-router'
import { CategoryDirectory, QuickCategories } from './category-directory'

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

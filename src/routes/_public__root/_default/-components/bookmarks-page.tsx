import { Star } from 'lucide-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MemesList } from '~/components/meme/memes-list'
import { buttonVariants } from '~/components/ui/button'
import { m } from '~/paraglide/messages'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'

const BookmarksEmpty = () => {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-12 text-center">
      <Star className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground text-balance">
        {m.settings_bookmarks_empty_description()}
      </p>
      <Link to="/memes" className={buttonVariants({ variant: 'outline' })}>
        {m.settings_bookmarks_empty_cta()}
      </Link>
    </div>
  )
}

export const BookmarksPage = () => {
  const bookmarkedMemesQuery = useSuspenseQuery(listBookmarkedMemesQueryOpts())

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <PageHeading>{m.settings_bookmarks_heading()}</PageHeading>
        <PageDescription>{m.settings_bookmarks_description()}</PageDescription>
      </div>
      <div className="w-full mx-auto">
        {bookmarkedMemesQuery.data.bookmarks.length === 0 ? (
          <BookmarksEmpty />
        ) : (
          <MemesList
            layoutContext="bookmarks"
            memes={bookmarkedMemesQuery.data.bookmarks}
          />
        )}
      </div>
    </div>
  )
}

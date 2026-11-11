import { useSuspenseQuery } from '@tanstack/react-query'
import { MemesList } from '~/components/meme/memes-list'
import { m } from '~/paraglide/messages.js'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import {
  PageDescription,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'

export const BookmarksPage = () => {
  const bookmarkedMemesQuery = useSuspenseQuery(listBookmarkedMemesQueryOpts())

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <PageHeading>{m.settings_bookmarks_heading()}</PageHeading>
        <PageDescription>{m.settings_bookmarks_description()}</PageDescription>
      </div>
      <div className="w-full mx-auto">
        <MemesList
          layoutContext="bookmarks"
          memes={bookmarkedMemesQuery.data.bookmarks}
        />
      </div>
    </div>
  )
}

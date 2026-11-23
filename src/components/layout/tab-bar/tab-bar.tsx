import { Clapperboard, House, LayoutGrid } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { AccountDrawer } from '~/components/layout/tab-bar/account-drawer'
import { TAB_ITEM_CLASS } from '~/components/layout/tab-bar/tab-item-class'
import { useIsLibraryActive } from '~/components/layout/use-is-library-active'
import { SearchSheet } from '~/components/search/search-sheet'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { m } from '~/paraglide/messages'

export const TabBar = () => {
  const isLibraryActive = useIsLibraryActive()

  return (
    <nav
      data-testid="tab-bar"
      aria-label={m.nav_tabs()}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] lg:hidden"
    >
      <ul className="grid h-(--tab-bar-height) grid-cols-5">
        <li>
          <Link
            to="/"
            preload="intent"
            activeOptions={{ exact: true }}
            className={TAB_ITEM_CLASS}
          >
            <House aria-hidden="true" />
            {m.nav_home()}
          </Link>
        </li>
        <li>
          <Link
            to="/memes/category/$slug"
            params={{ slug: ALL_CATEGORY_SLUG }}
            preload="intent"
            className={TAB_ITEM_CLASS}
            aria-current={isLibraryActive ? 'page' : undefined}
          >
            <LayoutGrid aria-hidden="true" />
            {m.nav_memes()}
          </Link>
        </li>
        <li>
          <Link to="/reels" preload="intent" className={TAB_ITEM_CLASS}>
            <Clapperboard aria-hidden="true" />
            {m.nav_reels()}
          </Link>
        </li>
        <li>
          <SearchSheet />
        </li>
        <li>
          <AccountDrawer />
        </li>
      </ul>
    </nav>
  )
}

import React from 'react'
import { House, LayoutGrid } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { AccountDrawer } from '~/components/layout/tab-bar/account-drawer'
import { SearchDrawer } from '~/components/layout/tab-bar/search-drawer'
import { TAB_ITEM_CLASS } from '~/components/layout/tab-bar/tab-item-class'
import { useHideOnScrollDown } from '~/components/layout/tab-bar/use-hide-on-scroll-down'
import { m } from '~/paraglide/messages'

export const TabBar = () => {
  const tabBarRef = React.useRef<HTMLElement>(null)

  useHideOnScrollDown(tabBarRef)

  return (
    <nav
      ref={tabBarRef}
      data-tab-bar
      data-testid="tab-bar"
      aria-label={m.nav_tabs()}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] lg:hidden"
    >
      <ul className="grid h-(--tab-bar-height) grid-cols-4">
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
          <Link to="/memes" preload="intent" className={TAB_ITEM_CLASS}>
            <LayoutGrid aria-hidden="true" />
            {m.nav_memes()}
          </Link>
        </li>
        <li>
          <SearchDrawer />
        </li>
        <li>
          <AccountDrawer />
        </li>
      </ul>
    </nav>
  )
}

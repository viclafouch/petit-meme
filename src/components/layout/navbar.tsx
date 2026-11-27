import { User } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Link, useRouteContext } from '@tanstack/react-router'
import { ThemeSwitcher } from '~/components/animate-ui/theme-switcher'
import { LanguageSwitcher } from '~/components/layout/language-switcher'
import { useIsLibraryActive } from '~/components/layout/use-is-library-active'
import { UserDropdown } from '~/components/layout/user-dropdown'
import { PremiumNavButton } from '~/components/premium/premium-nav-button'
import { NavbarSearch } from '~/components/search/navbar-search'
import { Button } from '~/components/ui/button'
import { LOGO_PATH } from '~/constants/branding'
import { ALL_CATEGORY_SLUG } from '~/constants/meme'
import { useIsLargeScreen } from '~/hooks/use-is-large-screen'
import { useNeedsScrollFadeFallback } from '~/hooks/use-scroll-fade'
import { m } from '~/paraglide/messages'
import { useDialogStore } from '~/stores/dialog.store'
import navbarCss from './navbar.css?url'

const NAVBAR_SCROLL_FADE_RANGE = 180

const NAVBAR_BACKDROP_CLASS_NAME =
  'navbar-scroll-fade absolute inset-0 bg-background max-lg:animate-none max-lg:opacity-100'

const NAVBAR_LINK_CLASS_NAME =
  'flex h-9 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:focus-ring mouse:hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground'

const NavigationLinks = () => {
  const isLibraryActive = useIsLibraryActive()

  return (
    <nav className="max-lg:hidden" aria-label={m.nav_menu()}>
      <ul className="flex gap-1">
        <li>
          <Link
            to="/memes/category/$slug"
            params={{ slug: ALL_CATEGORY_SLUG }}
            preload="viewport"
            className={NAVBAR_LINK_CLASS_NAME}
            data-status={isLibraryActive ? 'active' : undefined}
            aria-current={isLibraryActive ? 'page' : undefined}
          >
            {m.nav_memes()}
          </Link>
        </li>
        <li>
          <Link to="/app" preload="intent" className={NAVBAR_LINK_CLASS_NAME}>
            {m.nav_app()}
          </Link>
        </li>
      </ul>
    </nav>
  )
}

const NavbarScrollFadeFallback = () => {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, NAVBAR_SCROLL_FADE_RANGE], [0, 1])

  return (
    <motion.div
      className={NAVBAR_BACKDROP_CLASS_NAME}
      style={{ opacity }}
      aria-hidden="true"
    />
  )
}

const AccountAction = () => {
  const dialogStore = useDialogStore()
  const { user } = useRouteContext({ from: '__root__' })

  if (user) {
    return <UserDropdown user={user} />
  }

  return (
    <Button
      onClick={(event) => {
        event.preventDefault()
        dialogStore.actions.showDialog('auth')
      }}
      variant="default"
      size="lg"
    >
      <User aria-hidden="true" />
      {m.nav_sign_in()}
    </Button>
  )
}

export const Navbar = () => {
  const needsFallback = useNeedsScrollFadeFallback()
  const isLargeScreen = useIsLargeScreen()

  return (
    <header className="relative h-(--navbar-height) pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
      <link rel="stylesheet" href={navbarCss} precedence="default" />
      {needsFallback && isLargeScreen ? (
        <NavbarScrollFadeFallback />
      ) : (
        <div className={NAVBAR_BACKDROP_CLASS_NAME} aria-hidden="true" />
      )}
      <div className="relative container-wide flex h-full items-center justify-between gap-3 lg:gap-6">
        <div className="flex min-w-max shrink-0 items-center gap-4 lg:flex-1">
          <Link
            to="/"
            className="grid size-10 shrink-0 place-items-center rounded-full transition-colors focus-visible:focus-ring mouse:hover:bg-accent"
            aria-label={m.common_logo_alt()}
          >
            <img
              src={LOGO_PATH}
              alt=""
              width={28}
              height={28}
              decoding="async"
            />
          </Link>
          <NavigationLinks />
        </div>
        <div className="flex min-w-0 flex-[0_1_40rem] justify-center max-lg:hidden">
          <NavbarSearch />
        </div>
        <div className="flex min-w-max shrink-0 items-center justify-end gap-2 lg:flex-1 lg:gap-3">
          <div className="max-lg:hidden">
            <PremiumNavButton />
          </div>
          <LanguageSwitcher />
          <ThemeSwitcher className="max-lg:hidden" />
          <div className="max-lg:hidden">
            <AccountAction />
          </div>
        </div>
      </div>
    </header>
  )
}

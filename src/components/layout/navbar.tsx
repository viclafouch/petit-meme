import { User } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { type LinkOptions, Link, useRouteContext } from '@tanstack/react-router'
import { ThemeSwitcher } from '~/components/animate-ui/theme-switcher'
import { LanguageSwitcher } from '~/components/layout/language-switcher'
import { UserDropdown } from '~/components/layout/user-dropdown'
import { PremiumNavButton } from '~/components/premium/premium-nav-button'
import { NavbarSearch } from '~/components/search/navbar-search'
import { Button } from '~/components/ui/button'
import { LOGO_PATH } from '~/constants/branding'
import { useNeedsScrollFadeFallback } from '~/hooks/use-scroll-fade'
import { m } from '~/paraglide/messages'
import { useDialogStore } from '~/stores/dialog.store'
import navbarCss from './navbar.css?url'

type NavigationLink = {
  to: LinkOptions['to']
  label: string
  preload: LinkOptions['preload']
}

const NAVBAR_SCROLL_FADE_RANGE = 180

const NAVBAR_BACKDROP_CLASS_NAME =
  'navbar-scroll-fade absolute inset-0 bg-background'

const getNavigationLinks = (): NavigationLink[] => {
  return [
    { to: '/memes', label: m.nav_memes(), preload: 'viewport' },
    { to: '/app', label: m.nav_app(), preload: 'intent' }
  ]
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

  return (
    <header className="navbar">
      <link rel="stylesheet" href={navbarCss} precedence="default" />
      {needsFallback ? (
        <NavbarScrollFadeFallback />
      ) : (
        <div className={NAVBAR_BACKDROP_CLASS_NAME} aria-hidden="true" />
      )}
      <div className="navbar-inner">
        <div className="navbar-start">
          <Link to="/" className="navbar-logo" aria-label={m.common_logo_alt()}>
            <img
              src={LOGO_PATH}
              alt=""
              width={28}
              height={28}
              decoding="async"
            />
          </Link>
          <nav className="navbar-links" aria-label={m.nav_menu()}>
            <ul>
              {getNavigationLinks().map((link) => {
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      preload={link.preload}
                      className="navbar-link"
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
        <div className="navbar-center">
          <NavbarSearch />
        </div>
        <div className="navbar-end">
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

import React from 'react'
import { User } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { type LinkOptions, Link, useRouteContext } from '@tanstack/react-router'
import { ThemeSwitcher } from '~/components/animate-ui/theme-switcher'
import { InstallAppButton } from '~/components/install/install-app-button'
import { LanguageSwitcher } from '~/components/layout/language-switcher'
import { UserDropdown } from '~/components/layout/user-dropdown'
import { Button, buttonVariants } from '~/components/ui/button'
import { LOGO_PATH } from '~/constants/branding'
import { useNeedsScrollFadeFallback } from '~/hooks/use-scroll-fade'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { useDialogStore } from '~/stores/dialog.store'

type NavigationLink = {
  to: LinkOptions['to']
  label: string
  preload: LinkOptions['preload']
}

const NAVBAR_SCROLL_FADE_RANGE = 180

const NAVBAR_BACKDROP_CLASS_NAME =
  'navbar-scroll-fade absolute inset-0 bg-background'

const NAVIGATION_LINK_CLASS_NAME =
  'flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow] outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50'

const getNavigationLinks = (): NavigationLink[] => {
  return [
    { to: '/memes', label: m.nav_memes(), preload: 'viewport' },
    { to: '/pricing', label: m.nav_plans(), preload: 'viewport' },
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

export const Navbar = () => {
  const dialogStore = useDialogStore()
  const { user } = useRouteContext({ from: '__root__' })
  const navigationLinks = getNavigationLinks()
  const needsFallback = useNeedsScrollFadeFallback()

  return (
    <header className="relative h-(--navbar-height) pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
      {needsFallback ? (
        <NavbarScrollFadeFallback />
      ) : (
        <div className={NAVBAR_BACKDROP_CLASS_NAME} aria-hidden="true" />
      )}
      <div className="container relative flex h-full items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-start gap-2">
          <Link
            to="/"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'dark:hover:bg-accent text-accent-foreground p-1'
            )}
          >
            <img
              src={LOGO_PATH}
              alt={m.common_logo_alt()}
              width={28}
              height={28}
              decoding="async"
            />
          </Link>
        </div>
        <nav className="max-lg:hidden" aria-label={m.nav_menu()}>
          <ul className="flex items-center">
            {navigationLinks.map((link) => {
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    preload={link.preload}
                    className={NAVIGATION_LINK_CLASS_NAME}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex flex-1 items-center justify-end gap-3">
          <InstallAppButton
            surface="header"
            size="sm"
            variant="secondary"
            className="touch-tap lg:hidden"
          />
          <LanguageSwitcher />
          <ThemeSwitcher className="max-lg:hidden" />
          <div className="max-lg:hidden">
            {user ? (
              <UserDropdown user={user} />
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

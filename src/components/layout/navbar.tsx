import React from 'react'
import { User } from 'lucide-react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { type LinkOptions, Link, useRouteContext } from '@tanstack/react-router'
import { ThemeSwitcher } from '~/components/animate-ui/theme-switcher'
import { InstallAppButton } from '~/components/install/install-app-button'
import { LanguageSwitcher } from '~/components/layout/language-switcher'
import { UserDropdown } from '~/components/layout/user-dropdown'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList
} from '~/components/ui/navigation-menu'
import { LOGO_PATH } from '~/constants/branding'
import { useNeedsScrollFadeFallback } from '~/hooks/use-scroll-fade'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { useDialogStore } from '~/stores/dialog.store'

export type NavigationLink = {
  to: LinkOptions['to']
  label: string
  className?: string
  preload: LinkOptions['preload']
}

const NAVBAR_SCROLL_FADE_RANGE = 180

const getNavigationLinks = (): NavigationLink[] => {
  return [
    { to: '/memes', label: m.nav_memes(), preload: 'viewport' },
    { to: '/pricing', label: m.nav_plans(), preload: 'viewport' },
    { to: '/submit', label: m.nav_submit(), preload: 'intent' }
  ]
}

const NavbarScrollFadeFallback = () => {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, NAVBAR_SCROLL_FADE_RANGE], [0, 1])

  return (
    <motion.div
      data-navbar-bg
      className="absolute inset-0 bg-background"
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
  const isReducedMotion = useReducedMotion()

  return (
    <header className="navbar-scroll-fade relative h-(--navbar-height)">
      {needsFallback && !isReducedMotion ? <NavbarScrollFadeFallback /> : null}
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
        <NavigationMenu className="max-lg:hidden" aria-label={m.nav_menu()}>
          <NavigationMenuList>
            {navigationLinks.map((link) => {
              return (
                <NavigationMenuItem key={link.to}>
                  <NavigationMenuLink
                    data-active={false}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-medium',
                      link.className
                    )}
                    render={<Link to={link.to} preload={link.preload} />}
                  >
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
            })}
          </NavigationMenuList>
        </NavigationMenu>
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

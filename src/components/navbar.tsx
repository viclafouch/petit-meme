import React from 'react'
import { User } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ThemeSwitcher } from '~/components/animate-ui/theme-switcher'
import { LanguageSwitcher } from '~/components/language-switcher'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList
} from '~/components/ui/navigation-menu'
import { UserDropdown } from '~/components/user-dropdown'
import { LOGO_PATH } from '~/constants/branding'
import { useNeedsScrollFadeFallback } from '~/hooks/use-scroll-fade'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { useShowDialog } from '~/stores/dialog.store'
import type { LinkOptions } from '@tanstack/react-router'
import { Link, useRouteContext } from '@tanstack/react-router'
import { MobileNav } from './mobile-nav'

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
    { to: '/submit', label: m.nav_submit(), preload: 'intent' },
    {
      to: '/reels',
      label: m.nav_reels(),
      className: 'md:hidden',
      preload: 'intent'
    }
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
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()
  const navigationLinks = getNavigationLinks()
  const needsFallback = useNeedsScrollFadeFallback()
  const shouldReduceMotion = useReducedMotion()

  return (
    <header className="navbar-scroll-fade fixed top-0 right-0 left-0 z-50 h-(--navbar-height)">
      {needsFallback && !shouldReduceMotion ? (
        <NavbarScrollFadeFallback />
      ) : null}
      <div className="container relative flex h-full items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-start gap-2">
          <MobileNav links={navigationLinks} user={user} />
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
        <NavigationMenu className="max-md:hidden" aria-label={m.nav_menu()}>
          <NavigationMenuList>
            {navigationLinks.map((link) => {
              return (
                <NavigationMenuItem key={link.to}>
                  <NavigationMenuLink
                    asChild
                    data-active={false}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-medium',
                      link.className
                    )}
                  >
                    <Link to={link.to} preload={link.preload}>
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
            })}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex flex-1 items-center justify-end gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher className="max-md:hidden" />
          {user ? (
            <UserDropdown user={user} />
          ) : (
            <Button
              onClick={(event) => {
                event.preventDefault()
                showDialog('auth', {})
              }}
              variant="default"
              size="lg"
              className="max-md:size-9 max-md:p-0"
            >
              <User aria-hidden="true" />
              <span className="max-md:hidden">{m.nav_sign_in()}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

import React from 'react'
import { User } from 'lucide-react'
import { ThemeSwitcher } from '@/components/animate-ui/theme-switcher'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList
} from '@/components/ui/navigation-menu'
import { UserDropdown } from '@/components/user-dropdown'
import { LOGO_PATH } from '@/constants/branding'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { useShowDialog } from '@/stores/dialog.store'
import type { LinkOptions } from '@tanstack/react-router'
import { Link, useRouteContext } from '@tanstack/react-router'
import { MobileNav } from './mobile-nav'

export type NavigationLink = {
  to: LinkOptions['to']
  label: string
  className?: string
  preload: LinkOptions['preload']
}

const getNavigationLinks = (): NavigationLink[] => {
  return [
    { to: '/memes', label: m.nav_memes(), preload: 'viewport' },
    { to: '/pricing', label: m.nav_plans(), preload: 'viewport' },
    {
      to: '/reels',
      label: m.nav_reels(),
      className: 'md:hidden',
      preload: 'intent'
    }
  ]
}

export const Navbar = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()
  const navigationLinks = getNavigationLinks()

  return (
    <header className="container flex h-14 items-center justify-between gap-4">
      <div className="flex flex-1 items-center justify-start gap-2">
        <MobileNav links={navigationLinks} />
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
      <NavigationMenu className="max-md:hidden">
        <NavigationMenuList>
          {navigationLinks.map((link, index) => {
            return (
              <NavigationMenuItem key={index}>
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
        <ThemeSwitcher />
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
          >
            <User />
            {m.nav_sign_in()}
          </Button>
        )}
      </div>
    </header>
  )
}

import React from 'react'
import { User } from 'lucide-react'
import { ThemeSwitcher } from '@/components/animate-ui/theme-switcher'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList
} from '@/components/ui/navigation-menu'
import { UserDropdown } from '@/components/user-dropdown'
import { cn } from '@/lib/utils'
import { useShowDialog } from '@/stores/dialog.store'
import type { LinkOptions } from '@tanstack/react-router'
import { Link, useRouteContext } from '@tanstack/react-router'
import { MobileNav } from './mobile-nav'

const NAVIGATIONS_LINKS = [
  {
    name: 'Menu',
    items: [
      { to: '/memes', label: 'Mèmes', preload: 'viewport' },
      { to: '/pricing', label: 'Plans', preload: 'viewport' },
      {
        to: '/reels',
        label: 'Reels',
        className: 'md:hidden',
        preload: 'intent'
      }
    ]
  }
] as const satisfies {
  name: string
  items: {
    to: LinkOptions['to']
    label: string
    active?: boolean
    className?: string
    preload: LinkOptions['preload']
  }[]
}[]

export const Navbar = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()

  return (
    <header className="container flex h-14 items-center justify-between gap-4">
      <div className="flex flex-1 items-center justify-start gap-2">
        <MobileNav nav={NAVIGATIONS_LINKS} />
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'dark:hover:bg-accent text-accent-foreground p-1'
          )}
        >
          <img src="/images/logo.png" alt="Logo" width={28} height={28} />
        </Link>
      </div>
      <NavigationMenu className="max-md:hidden">
        <NavigationMenuList>
          {NAVIGATIONS_LINKS[0].items.map((link, index) => {
            return (
              <NavigationMenuItem key={index}>
                <NavigationMenuLink
                  asChild
                  data-active={false}
                  className={cn(
                    'rounded-md px-3 py-1.5 font-medium',
                    'className' in link && link.className
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
            Se connecter
          </Button>
        )}
      </div>
    </header>
  )
}

import React from 'react'
import { CreditCard, Settings, Shield, SparklesIcon, Star } from 'lucide-react'
import { ThemeSwitcher } from '@/components/animate-ui/theme-switcher'
import { LanguageSwitcher } from '@/components/language-switcher'
import type { NavigationLink } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { getLegalLinks } from '@/constants/navigation'
import { useStripeCheckout } from '@/hooks/use-stripe-checkout'
import {
  getActiveSubscriptionQueryOpts,
  getFavoritesMemesQueryOpts
} from '@/lib/queries'
import type { SessionUser } from '@/lib/role'
import { matchIsUserAdmin } from '@/lib/role'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

const ACCOUNT_LINK_CLASS = 'flex items-center gap-3 text-lg font-medium'

type MobileNavProps = {
  links: NavigationLink[]
  user: SessionUser | null
}

export const MobileNav = ({ links, user }: MobileNavProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const { goToBillingPortal } = useStripeCheckout()
  const favoritesMemesCountQuery = useQuery({
    ...getFavoritesMemesQueryOpts(),
    enabled: Boolean(user)
  })
  const activeSubscriptionQuery = useQuery({
    ...getActiveSubscriptionQueryOpts(),
    enabled: Boolean(user)
  })

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="block size-8 touch-manipulation items-center justify-start gap-2.5 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent md:hidden dark:hover:bg-transparent"
        >
          <div className="relative flex items-center justify-center">
            <div className="relative size-4">
              <span
                className={cn(
                  'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                  isOpen ? 'top-[7px] -rotate-45' : 'top-0.5'
                )}
              />
              <span
                className={cn(
                  'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                  isOpen ? 'opacity-0' : 'top-[7px] opacity-100'
                )}
              />
              <span
                className={cn(
                  'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                  isOpen ? 'top-[7px] rotate-45' : 'top-[12px]'
                )}
              />
            </div>
            <span className="sr-only">{m.nav_toggle_menu()}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background/90 h-(--radix-popover-content-available-height) w-(--radix-popover-content-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
        align="start"
        side="bottom"
      >
        <div className="flex h-full flex-col justify-between overflow-auto p-6">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm font-medium">
                {m.nav_menu()}
              </p>
              <div className="flex flex-col gap-3">
                {links.map((link) => {
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      preload={link.preload}
                      className={cn('text-2xl font-medium', link.className)}
                      onClick={handleClose}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>
            {user ? (
              <div className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm font-medium">
                  {m.nav_account()}
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/favorites"
                    className={ACCOUNT_LINK_CLASS}
                    onClick={handleClose}
                  >
                    <Star className="size-5" />
                    {m.nav_favorites({
                      count: String(favoritesMemesCountQuery.data?.count ?? 0)
                    })}
                  </Link>
                  <Link
                    to="/settings"
                    className={ACCOUNT_LINK_CLASS}
                    onClick={handleClose}
                  >
                    <Settings className="size-5" />
                    {m.nav_my_account()}
                  </Link>
                  {activeSubscriptionQuery.data ? (
                    <Button
                      variant="ghost"
                      className={cn(
                        ACCOUNT_LINK_CLASS,
                        'h-auto justify-start p-0'
                      )}
                      onClick={() => {
                        handleClose()
                        void goToBillingPortal()
                      }}
                    >
                      <CreditCard className="size-5" />
                      {m.nav_manage_subscription()}
                    </Button>
                  ) : (
                    <Link
                      to="/pricing"
                      className={ACCOUNT_LINK_CLASS}
                      onClick={handleClose}
                    >
                      <SparklesIcon className="size-5" />
                      {m.nav_upgrade_premium()}
                    </Link>
                  )}
                  {matchIsUserAdmin(user) ? (
                    <Link
                      to="/admin"
                      className={ACCOUNT_LINK_CLASS}
                      onClick={handleClose}
                    >
                      <Shield className="size-5" />
                      {m.nav_admin()}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm font-medium">
                {m.nav_legal()}
              </p>
              <div className="flex flex-col gap-2">
                {getLegalLinks().map((link) => {
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="text-muted-foreground text-sm"
                      onClick={handleClose}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-border/40 pt-6">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

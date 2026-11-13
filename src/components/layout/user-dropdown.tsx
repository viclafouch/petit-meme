import React from 'react'
import {
  ChevronDown,
  CreditCard,
  LogOutIcon,
  Shield,
  SparklesIcon,
  Settings,
  Star
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useSignOut } from '~/components/auth/use-sign-out'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { useStripeCheckout } from '~/components/premium/use-stripe-checkout'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { UserAvatar } from '~/components/user/user-avatar'
import { matchIsUserAdmin, type SessionUser } from '~/helpers/role'
import { m } from '~/paraglide/messages'
import { listBookmarkedMemesQueryOpts } from '~/queries/bookmark'
import { getPremiumSubscriptionQueryOpts } from '~/queries/subscription'

type UserDropdownProps = {
  user: SessionUser
}

export const UserDropdown = ({ user }: UserDropdownProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const { goToBillingPortal } = useStripeCheckout()
  const { signOut } = useSignOut()

  const bookmarkedMemesQuery = useQuery(listBookmarkedMemesQueryOpts())
  const premiumSubscriptionQuery = useQuery(getPremiumSubscriptionQueryOpts())
  const isPremium = useIsPremium()

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="gap-2 px-2" />}
      >
        <UserAvatar
          name={user.name}
          image={user.image}
          email={user.email}
          size="sm"
          shape="rounded"
        />
        <div className="max-w-32 truncate max-lg:hidden">{user.name}</div>
        <ChevronDown className="max-lg:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" sideOffset={4}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <UserAvatar
                name={user.name}
                image={user.image}
                email={user.email}
                shape="rounded"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isPremium ? null : (
            <DropdownMenuLinkItem render={<Link to="/pricing" />}>
              <SparklesIcon />
              {m.nav_upgrade_premium()}
            </DropdownMenuLinkItem>
          )}
          {premiumSubscriptionQuery.data ? (
            <DropdownMenuItem
              onClick={() => {
                void goToBillingPortal()
              }}
              className="flex-col items-start gap-0.5"
            >
              <div className="flex items-start gap-2">
                <CreditCard className="mt-0.5" />
                {m.nav_manage_subscription()}
              </div>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLinkItem render={<Link to="/bookmarks" />}>
            <Star />
            {m.nav_my_bookmarks()}
            {bookmarkedMemesQuery.data?.count ? (
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {bookmarkedMemesQuery.data.count}
              </span>
            ) : null}
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link to="/settings" />}>
            <Settings />
            {m.nav_settings()}
          </DropdownMenuLinkItem>
          {matchIsUserAdmin(user) ? (
            <DropdownMenuLinkItem render={<Link to="/admin" />}>
              <Shield />
              {m.nav_admin()}
            </DropdownMenuLinkItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void signOut()
          }}
          className="text-red-600!"
        >
          <LogOutIcon className="text-red-600!" />
          {m.nav_sign_out()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

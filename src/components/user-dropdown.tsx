import React from 'react'
import type { UserWithRole } from 'better-auth/plugins'
import {
  ChevronDown,
  CreditCard,
  LogOutIcon,
  Shield,
  SparklesIcon,
  Star,
  User
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useStripeCheckout } from '@/hooks/use-stripe-checkout'
import { authClient } from '@/lib/auth-client'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts,
  getFavoritesMemesQueryOpts
} from '@/lib/queries'
import { matchIsUserAdmin } from '@/lib/role'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'

export const UserDropdown = ({ user }: { user: UserWithRole }) => {
  const [open, setOpen] = React.useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()
  const { goToBillingPortal, checkoutPremium } = useStripeCheckout()

  const favoritesMemesCountQuery = useQuery(getFavoritesMemesQueryOpts())
  const activeSubscriptionQuery = useQuery(getActiveSubscriptionQueryOpts())

  const handleLogout = async () => {
    await authClient.signOut()
    queryClient.removeQueries(getAuthUserQueryOpts())
    queryClient.removeQueries(getActiveSubscriptionQueryOpts())
    queryClient.removeQueries(getFavoritesMemesQueryOpts())
    await router.invalidate()
  }

  const subscription = activeSubscriptionQuery.data

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 px-2">
          <Avatar className="size-6 rounded-lg">
            <AvatarImage
              src={user.image ?? '/images/avatar.png'}
              alt="Avatar"
            />
            <AvatarFallback className="rounded-lg">
              {(user.name[0]! + user.name[1]!).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="truncate">{user.name}</div>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src={user.image ?? '/images/avatar.png'}
                alt="Avatar"
              />
              <AvatarFallback className="rounded-lg">
                {(user.name[0]! + user.name[1]!).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {!subscription ? (
            <DropdownMenuItem
              onClick={() => {
                checkoutPremium()
              }}
            >
              <SparklesIcon />
              Passer à Premium
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => {
                goToBillingPortal()
              }}
              className="flex-col items-start gap-0.5"
            >
              <div className="flex gap-2 items-start">
                <CreditCard className="mt-0.5" />
                <div className="flex flex-col">Gérer mon abonnement</div>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/favorites">
              <Star />
              Favoris ({favoritesMemesCountQuery.data?.count ?? 0})
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <User />
              Mon compte
            </Link>
          </DropdownMenuItem>
          {matchIsUserAdmin(user) ? (
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <Shield />
                Administration
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600!">
          <LogOutIcon className="text-red-600!" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { UserAvatar } from '~/components/user-avatar'
import { useSignOut } from '~/hooks/use-sign-out'
import type { SessionUser } from '~/lib/role'

type AdminNavButtonParams = {
  user: SessionUser
}

export const AdminNavButton = ({ user }: AdminNavButtonParams) => {
  const { signOut } = useSignOut()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full">
          <UserAvatar
            name={user.name}
            image={user.image}
            email={user.email}
            size="lg"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/">
            <ArrowLeft />
            Retour au site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void signOut()
          }}
        >
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

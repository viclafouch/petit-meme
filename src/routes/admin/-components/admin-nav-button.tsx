import { ArrowLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { DEFAULT_AVATAR_URL } from '@/constants/avatar'
import { getUserInitials } from '@/helpers/format'
import { useSignOut } from '@/hooks/use-sign-out'
import type { SessionUser } from '@/lib/role'
import { Link } from '@tanstack/react-router'

type AdminNavButtonParams = {
  user: SessionUser
}

export const AdminNavButton = ({ user }: AdminNavButtonParams) => {
  const { signOut } = useSignOut()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full">
          <Avatar className="size-9">
            <AvatarImage
              src={user.image ?? DEFAULT_AVATAR_URL}
              alt={user.name}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="rounded-lg">
              {getUserInitials(user.name)}
            </AvatarFallback>
          </Avatar>
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
        <DropdownMenuItem onClick={signOut}>Se déconnecter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

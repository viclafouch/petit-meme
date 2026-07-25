import { EllipsisVertical } from 'lucide-react'
import { getRouteApi } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import type { EnrichedUser } from '~/routes/admin/-server/users'
import {
  getUserModerationPermissions,
  NO_MODERATION_REASON,
  useUserModeration
} from './use-user-moderation'
import { UserModerationDialogs } from './user-moderation-dialogs'

const routeApi = getRouteApi('/admin')

type UserActionsCellParams = {
  user: EnrichedUser
}

export const UserActionsCell = ({ user }: UserActionsCellParams) => {
  const { user: admin } = routeApi.useRouteContext()
  const moderation = useUserModeration({ userId: user.id })

  const permissions = getUserModerationPermissions({
    target: user,
    adminId: admin.id
  })

  const hasActions =
    permissions.canBan || permissions.canUnban || permissions.canDelete

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex ml-auto"
            size="icon"
          >
            <EllipsisVertical />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {permissions.canUnban ? (
            <DropdownMenuItem
              onSelect={() => {
                moderation.openDialog('unban')
              }}
            >
              Débannir
            </DropdownMenuItem>
          ) : null}
          {permissions.canBan ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                moderation.openDialog('ban')
              }}
            >
              Bannir
            </DropdownMenuItem>
          ) : null}
          {permissions.canDelete ? (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                moderation.openDialog('delete')
              }}
            >
              Supprimer
            </DropdownMenuItem>
          ) : null}
          {hasActions ? null : (
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {NO_MODERATION_REASON}
            </DropdownMenuLabel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <UserModerationDialogs userName={user.name} moderation={moderation} />
    </>
  )
}

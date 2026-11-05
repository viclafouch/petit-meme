import { EllipsisVertical } from 'lucide-react'
import { getRouteApi } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import type { EnrichedUser } from '~/routes/admin/-server/users'
import {
  getUserActionPermissions,
  NO_USER_ACTION_REASON,
  useUserActions
} from './use-user-actions'
import { UserActionDialogs } from './user-action-dialogs'

const routeApi = getRouteApi('/admin')

type UserActionsCellProps = {
  user: EnrichedUser
}

export const UserActionsCell = ({ user }: UserActionsCellProps) => {
  const { user: admin } = routeApi.useRouteContext()
  const userActions = useUserActions({ userId: user.id })

  const permissions = getUserActionPermissions({
    target: user,
    adminId: admin.id
  })

  const hasActions =
    permissions.canBan || permissions.canUnban || permissions.canDelete

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="data-popup-open:bg-muted text-muted-foreground flex ml-auto"
              size="icon"
            />
          }
        >
          <EllipsisVertical />
          <span className="sr-only">Actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {permissions.canUnban ? (
            <DropdownMenuItem
              onClick={() => {
                userActions.openDialog('unban')
              }}
            >
              Débannir
            </DropdownMenuItem>
          ) : null}
          {permissions.canBan ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                userActions.openDialog('ban')
              }}
            >
              Bannir
            </DropdownMenuItem>
          ) : null}
          {permissions.canDelete ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                userActions.openDialog('delete')
              }}
            >
              Supprimer
            </DropdownMenuItem>
          ) : null}
          {hasActions ? null : (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                {NO_USER_ACTION_REASON}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <UserActionDialogs userName={user.name} userActions={userActions} />
    </>
  )
}

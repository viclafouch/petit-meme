import { Ban, ShieldCheck, Trash } from 'lucide-react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import type { AdminUserDetail } from '~/routes/admin/-server/user-detail'
import {
  getUserModerationPermissions,
  NO_MODERATION_REASON,
  useUserModeration
} from './use-user-moderation'
import { UserModerationDialogs } from './user-moderation-dialogs'

const routeApi = getRouteApi('/admin')

type UserDetailActionsParams = {
  user: Pick<AdminUserDetail, 'id' | 'name' | 'banned' | 'role'>
}

export const UserDetailActions = ({ user }: UserDetailActionsParams) => {
  const { user: admin } = routeApi.useRouteContext()
  const navigate = useNavigate()

  const moderation = useUserModeration({
    userId: user.id,
    onDeleted: () => {
      void navigate({ to: '/admin/users' })
    }
  })

  const permissions = getUserModerationPermissions({
    target: user,
    adminId: admin.id
  })

  const hasActions =
    permissions.canBan || permissions.canUnban || permissions.canDelete

  if (!hasActions) {
    return (
      <p className="text-sm text-muted-foreground">{NO_MODERATION_REASON}</p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {permissions.canUnban ? (
        <Button
          variant="outline"
          aria-busy={moderation.isPending}
          onClick={() => {
            moderation.openDialog('unban')
          }}
        >
          <ShieldCheck />
          Débannir
        </Button>
      ) : null}
      {permissions.canBan ? (
        <Button
          variant="outline"
          aria-busy={moderation.isPending}
          onClick={() => {
            moderation.openDialog('ban')
          }}
        >
          <Ban />
          Bannir
        </Button>
      ) : null}
      {permissions.canDelete ? (
        <Button
          variant="destructive"
          aria-busy={moderation.isPending}
          onClick={() => {
            moderation.openDialog('delete')
          }}
        >
          <Trash />
          Supprimer
        </Button>
      ) : null}
      <UserModerationDialogs userName={user.name} moderation={moderation} />
    </div>
  )
}

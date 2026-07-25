import React from 'react'
import { Calendar, Mail, Pencil } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { UserAvatar } from '~/components/user-avatar'
import { FOCUS_VISIBLE_RING_CLASS_NAME } from '~/constants/ui'
import type { SessionUser } from '~/lib/role'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime'
import type { ActiveSubscription } from '~/server/customer'
import { AvatarPickerDialog } from './avatar-picker-dialog'

type ProfileHeaderParams = {
  user: SessionUser
  activeSubscription: ActiveSubscription | null
}

export const ProfileHeader = ({
  user,
  activeSubscription
}: ProfileHeaderParams) => {
  const [isAvatarPickerOpened, setIsAvatarPickerOpened] = React.useState(false)

  return (
    <Card>
      <AvatarPickerDialog
        open={isAvatarPickerOpened}
        onOpenChange={setIsAvatarPickerOpened}
        user={user}
      />
      <CardContent className="p-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <button
            type="button"
            aria-label={m.settings_avatar_change()}
            className={cn(
              'group relative cursor-pointer rounded-full',
              FOCUS_VISIBLE_RING_CLASS_NAME
            )}
            onClick={() => {
              setIsAvatarPickerOpened(true)
            }}
          >
            <UserAvatar name={user.name} image={user.image} size="xl" />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <span
              aria-hidden="true"
              className="border-card bg-primary text-primary-foreground absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2"
            >
              <Pencil className="size-4" />
            </span>
          </button>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              {!activeSubscription ? (
                <Badge variant="secondary">{m.settings_badge_tester()}</Badge>
              ) : (
                <Badge variant="default">{m.settings_badge_premium()}</Badge>
              )}
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Mail className="size-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                {m.settings_member_since({
                  date: new Date(user.createdAt).toLocaleDateString(getLocale())
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

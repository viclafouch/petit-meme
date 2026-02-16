import type { User } from 'better-auth'
import { Calendar, Mail } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ActiveSubscription } from '@/server/customer'

export const ProfileHeader = ({
  user,
  activeSubscription
}: {
  user: User
  activeSubscription: ActiveSubscription | null
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative">
            <Avatar className="size-24">
              <AvatarImage
                src={user.image ?? '/images/avatar.png'}
                alt={user.name}
              />
              <AvatarFallback className="rounded-lg">
                {(user.name[0]! + user.name[1]).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              {!activeSubscription ? (
                <Badge variant="secondary">Utilisateur Testeur</Badge>
              ) : (
                <Badge variant="default">Utilisateur Premium</Badge>
              )}
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Mail className="size-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                Membre depuis le{' '}
                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

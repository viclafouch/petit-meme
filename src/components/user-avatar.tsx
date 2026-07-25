import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { getUserInitials } from '~/helpers/format'
import { cn } from '~/lib/utils'

type UserAvatarSize = 'sm' | 'md'

type UserAvatarSizeClasses = {
  avatar: string
  fallback: string
}

const USER_AVATAR_SIZE_CLASSES = {
  sm: { avatar: 'size-4', fallback: 'text-[8px]' },
  md: { avatar: 'size-8', fallback: 'text-xs' }
} as const satisfies Record<UserAvatarSize, UserAvatarSizeClasses>

type UserAvatarParams = {
  name: string
  image: string | null
  size?: UserAvatarSize
  className?: string
}

export const UserAvatar = ({
  name,
  image,
  size = 'md',
  className
}: UserAvatarParams) => {
  const sizeClasses = USER_AVATAR_SIZE_CLASSES[size]

  return (
    <Avatar className={cn(sizeClasses.avatar, className)}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className={sizeClasses.fallback}>
        {getUserInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

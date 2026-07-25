import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { getAvatarSlotIdForEmail, resolveAvatarPath } from '~/helpers/avatar'
import { getUserInitials } from '~/helpers/format'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type UserAvatarShape = 'circle' | 'rounded'

type UserAvatarSizeClasses = {
  avatar: string
  fallback: string
}

const USER_AVATAR_SIZE_CLASSES = {
  xs: { avatar: 'size-4', fallback: 'text-3xs' },
  sm: { avatar: 'size-6', fallback: 'text-2xs' },
  md: { avatar: 'size-8', fallback: 'text-xs' },
  lg: { avatar: 'size-9', fallback: 'text-sm' },
  xl: { avatar: 'size-24', fallback: 'text-2xl' }
} as const satisfies Record<UserAvatarSize, UserAvatarSizeClasses>

const USER_AVATAR_SHAPE_CLASSES = {
  circle: 'rounded-full',
  rounded: 'rounded-lg'
} as const satisfies Record<UserAvatarShape, string>

type UserAvatarParams = {
  name: string
  image: string | null | undefined
  email?: string
  size?: UserAvatarSize
  shape?: UserAvatarShape
  className?: string
}

export const UserAvatar = ({
  name,
  image,
  email,
  size = 'md',
  shape = 'circle',
  className
}: UserAvatarParams) => {
  const [hasImageFailed, setHasImageFailed] = React.useState(false)

  const sizeClasses = USER_AVATAR_SIZE_CLASSES[size]
  const shapeClassName = USER_AVATAR_SHAPE_CLASSES[shape]
  const alt = m.common_avatar_alt({ name })

  const catalogFallbackImage = email
    ? resolveAvatarPath(getAvatarSlotIdForEmail(email))
    : null

  return (
    <Avatar className={cn(sizeClasses.avatar, shapeClassName, className)}>
      {image ? (
        <AvatarImage
          src={image}
          alt={alt}
          referrerPolicy="no-referrer"
          onLoadingStatusChange={(status) => {
            setHasImageFailed(status === 'error')
          }}
        />
      ) : null}
      <AvatarFallback className={cn(shapeClassName, sizeClasses.fallback)}>
        {hasImageFailed && catalogFallbackImage ? (
          <img
            src={catalogFallbackImage}
            alt={alt}
            className="aspect-square size-full"
          />
        ) : (
          getUserInitials(name)
        )}
      </AvatarFallback>
    </Avatar>
  )
}

import { APP_ICON_PATHNAME } from '~/constants/pwa'
import { cn } from '~/lib/utils'

type AppIconProps = {
  size: number
  className?: string
}

export const AppIcon = ({ size, className }: AppIconProps) => {
  return (
    <img
      src={APP_ICON_PATHNAME}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      className={cn('rounded-[22%] bg-black ring-1 ring-white/10', className)}
    />
  )
}

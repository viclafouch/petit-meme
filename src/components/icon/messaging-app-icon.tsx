import {
  MESSAGING_APPS_SPRITE_PATH,
  type MessagingApp
} from '~/constants/messaging-apps'
import { cn } from '~/lib/utils'

type MessagingAppIconProps = {
  app: MessagingApp
  className?: string
}

export const MessagingAppIcon = ({ app, className }: MessagingAppIconProps) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex aspect-square items-center justify-center rounded-[23%]',
        app.tileClassName,
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[58%]">
        <use href={`${MESSAGING_APPS_SPRITE_PATH}#${app.id}`} />
      </svg>
    </span>
  )
}

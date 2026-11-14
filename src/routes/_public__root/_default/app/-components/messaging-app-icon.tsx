import { cn } from '~/lib/utils'
import { DEMO_ASSET_PATHS } from '~/routes/_public__root/_default/app/-lib/demo'
import type { MessagingApp } from '~/routes/_public__root/_default/app/-lib/messaging-apps'

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
        <use href={`${DEMO_ASSET_PATHS.messagingAppsSprite}#${app.id}`} />
      </svg>
    </span>
  )
}

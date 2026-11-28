import { MessagingAppIcon } from '~/components/icon/messaging-app-icon'
import { MESSAGING_APPS } from '~/constants/messaging-apps'
import { cn } from '~/lib/utils'
import shareDemoCss from './share-demo.css?url'

const SHARE_DESTINATION_COUNT = 5

type ShareDestinationsProps = {
  className?: string
}

export const ShareDestinations = ({ className }: ShareDestinationsProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute max-xl:hidden', className)}
    >
      {MESSAGING_APPS.slice(0, SHARE_DESTINATION_COUNT).map((app) => {
        return (
          <MessagingAppIcon
            key={app.id}
            app={app}
            className="share-destination"
          />
        )
      })}
      <link rel="stylesheet" href={shareDemoCss} precedence="default" />
    </div>
  )
}

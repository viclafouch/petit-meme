import { AnimatedBanner } from '~/components/layout/animated-banner'
import { BannerCloseButton } from '~/components/layout/banner-close-button'
import { ANNOUNCEMENT_DAY } from '~/constants/announcement'
import { formatDate } from '~/helpers/date'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

type AnnouncementBannerProps = {
  onDismiss: () => void
}

export const AnnouncementBanner = ({ onDismiss }: AnnouncementBannerProps) => {
  const date = formatDate(new Date(ANNOUNCEMENT_DAY), getLocale())

  return (
    <AnimatedBanner>
      <p className="px-10 text-xs text-foreground sm:text-sm">
        {m.announcement_banner_message({ date })}
      </p>
      <BannerCloseButton onClick={onDismiss} />
    </AnimatedBanner>
  )
}

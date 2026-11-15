import { AuroraBanner } from '~/components/layout/aurora-banner'
import { BannerCloseButton } from '~/components/layout/banner-close-button'
import { ANNOUNCEMENT_DAY } from '~/constants/banner'
import { formatDate } from '~/helpers/date'
import { m } from '~/paraglide/messages'
import { getLocale } from '~/paraglide/runtime'

type AnnouncementBannerProps = {
  onDismiss: () => void
}

export const AnnouncementBanner = ({ onDismiss }: AnnouncementBannerProps) => {
  const date = formatDate(new Date(ANNOUNCEMENT_DAY), getLocale())

  return (
    <AuroraBanner>
      <p className="px-9 text-xs text-balance text-foreground md:text-sm">
        {m.announcement_banner_message({ date })}
      </p>
      <BannerCloseButton onClick={onDismiss} />
    </AuroraBanner>
  )
}

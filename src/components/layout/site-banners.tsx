import { AnnouncementBanner } from '~/components/layout/announcement-banner'
import { CollapsibleBanner } from '~/components/layout/collapsible-banner'
import { LocaleBanner } from '~/components/layout/locale-banner'
import {
  ANNOUNCEMENT_BANNER_DISMISSAL,
  LOCALE_BANNER_DISMISSAL
} from '~/constants/banner'
import { useBannerDismissal } from '~/hooks/use-banner-dismissal'
import type { Locale } from '~/paraglide/runtime'

type SiteBannersProps = {
  suggestedLocale: Locale | null
  isAnnouncementInitiallyDismissed: boolean
}

export const SiteBanners = ({
  suggestedLocale,
  isAnnouncementInitiallyDismissed
}: SiteBannersProps) => {
  const [isLocaleBannerDismissed, dismissLocaleBanner] = useBannerDismissal(
    LOCALE_BANNER_DISMISSAL,
    false
  )
  const [isAnnouncementDismissed, dismissAnnouncement] = useBannerDismissal(
    ANNOUNCEMENT_BANNER_DISMISSAL,
    isAnnouncementInitiallyDismissed
  )

  const isLocaleBannerShown =
    suggestedLocale !== null && !isLocaleBannerDismissed

  return (
    <>
      {suggestedLocale === null ? null : (
        <CollapsibleBanner isCollapsed={isLocaleBannerDismissed}>
          <LocaleBanner
            suggestedLocale={suggestedLocale}
            onDismiss={dismissLocaleBanner}
          />
        </CollapsibleBanner>
      )}
      {isAnnouncementInitiallyDismissed ? null : (
        <CollapsibleBanner
          isCollapsed={isAnnouncementDismissed || isLocaleBannerShown}
        >
          <AnnouncementBanner onDismiss={dismissAnnouncement} />
        </CollapsibleBanner>
      )}
    </>
  )
}

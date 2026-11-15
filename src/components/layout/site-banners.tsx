import React from 'react'
import { useHydrated } from '@tanstack/react-router'
import { AnnouncementBanner } from '~/components/layout/announcement-banner'
import { CollapsibleBanner } from '~/components/layout/collapsible-banner'
import { LocaleBanner } from '~/components/layout/locale-banner'
import { getSuggestedLocale } from '~/helpers/locale'
import { dismissAnnouncement } from '~/lib/announcement-banner'
import { dismissLocaleBanner } from '~/lib/locale-banner'
import { getLocale, locales } from '~/paraglide/runtime'

type SiteBannersProps = {
  isLocaleBannerInitiallyDismissed: boolean
  isAnnouncementInitiallyDismissed: boolean
}

export const SiteBanners = ({
  isLocaleBannerInitiallyDismissed,
  isAnnouncementInitiallyDismissed
}: SiteBannersProps) => {
  const isHydrated = useHydrated()
  const [isLocaleBannerDismissed, setIsLocaleBannerDismissed] = React.useState(
    isLocaleBannerInitiallyDismissed
  )
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = React.useState(
    isAnnouncementInitiallyDismissed
  )

  const suggestedLocale =
    isHydrated && !isLocaleBannerInitiallyDismissed
      ? getSuggestedLocale({
          browserLanguages: navigator.languages,
          currentLocale: getLocale(),
          availableLocales: locales
        })
      : null

  const isLocaleBannerShown =
    suggestedLocale !== null && !isLocaleBannerDismissed

  const handleLocaleBannerDismiss = () => {
    dismissLocaleBanner()
    setIsLocaleBannerDismissed(true)
  }

  const handleAnnouncementDismiss = () => {
    dismissAnnouncement()
    setIsAnnouncementDismissed(true)
  }

  return (
    <>
      {suggestedLocale === null ? null : (
        <CollapsibleBanner
          isCollapsed={isLocaleBannerDismissed}
          isAnimatedOnEntry
        >
          <LocaleBanner
            suggestedLocale={suggestedLocale}
            onDismiss={handleLocaleBannerDismiss}
          />
        </CollapsibleBanner>
      )}
      {isAnnouncementInitiallyDismissed ? null : (
        <CollapsibleBanner
          isCollapsed={isAnnouncementDismissed || isLocaleBannerShown}
          isAnimatedOnEntry={false}
        >
          <AnnouncementBanner onDismiss={handleAnnouncementDismiss} />
        </CollapsibleBanner>
      )}
    </>
  )
}

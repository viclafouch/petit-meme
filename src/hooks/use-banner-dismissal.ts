import React from 'react'
import type { BannerDismissal } from '~/constants/banner'
import { dismissBanner } from '~/lib/banner-dismissal'

export const useBannerDismissal = (
  dismissal: BannerDismissal,
  isInitiallyDismissed: boolean
) => {
  const [isDismissed, setIsDismissed] = React.useState(isInitiallyDismissed)

  const dismiss = () => {
    dismissBanner(dismissal)
    setIsDismissed(true)
  }

  return [isDismissed, dismiss] as const
}

import { toast } from 'sonner'
import { useMatchRoute } from '@tanstack/react-router'
import { useInstallApp } from '~/components/install/use-install-app'
import { useIsPremium } from '~/components/premium/use-is-premium'
import { resolveExportFollowUp } from '~/helpers/export-follow-up'
import { markInstallOffered, matchWasInstallOffered } from '~/lib/install-app'
import {
  readPremiumReminderSnoozedAt,
  snoozePremiumReminder
} from '~/lib/premium-reminder'
import { m } from '~/paraglide/messages'
import { useDialogStore } from '~/stores/dialog.store'

const INSTALL_OFFER_DURATION_MS = 12_000

export const useExportFollowUp = () => {
  const dialogStore = useDialogStore()
  const isPremium = useIsPremium()
  const matchRoute = useMatchRoute()
  const { method: installMethod, install } = useInstallApp()
  const isOverFullScreenPlayer = Boolean(matchRoute({ to: '/reels' }))
  const isInstallable = installMethod !== null && installMethod !== 'installed'

  const offerInstall = () => {
    markInstallOffered()
    toast(m.install_offer_title(), {
      description: m.install_offer_description(),
      duration: INSTALL_OFFER_DURATION_MS,
      action: {
        label: m.install_cta(),
        onClick: () => {
          void install()
        }
      }
    })
  }

  const offerPremium = () => {
    snoozePremiumReminder()
    dialogStore.actions.showDialog('premium-reminder')
  }

  return () => {
    if (dialogStore.state.isOpen) {
      return
    }

    const followUp = resolveExportFollowUp({
      isPremium,
      isInstallable,
      canShowInstallOfferHere: !isOverFullScreenPlayer,
      wasInstallOffered: matchWasInstallOffered(),
      premiumSnoozedAt: readPremiumReminderSnoozedAt(),
      now: Date.now()
    })

    if (followUp === 'install') {
      offerInstall()
    }

    if (followUp === 'premium') {
      offerPremium()
    }
  }
}

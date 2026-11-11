import React from 'react'
import { useIsPremium } from '~/components/premium/use-is-premium'
import {
  PREMIUM_REMINDER_DELAY_MS,
  PREMIUM_REMINDER_STORAGE_KEY
} from '~/constants/plan'
import { DAY } from '~/constants/time'
import { useDialogStore } from '~/stores/dialog.store'

const COOLDOWN_DAYS = 3
const COOLDOWN_MS = COOLDOWN_DAYS * DAY

type UsePremiumReminderParams = {
  enabled: boolean
}

export const snoozePremiumReminder = () => {
  localStorage.setItem(PREMIUM_REMINDER_STORAGE_KEY, String(Date.now()))
}

export const usePremiumReminder = ({ enabled }: UsePremiumReminderParams) => {
  const dialogStore = useDialogStore()
  const isPremium = useIsPremium()

  const matchIsReminderRelevant = React.useEffectEvent(() => {
    if (isPremium) {
      return false
    }

    const snoozedAt = localStorage.getItem(PREMIUM_REMINDER_STORAGE_KEY)

    const isSnoozed =
      snoozedAt !== null && Date.now() - Number(snoozedAt) < COOLDOWN_MS

    return !isSnoozed
  })

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null

    const showReminderWhenScreenIsFree = () => {
      if (!matchIsReminderRelevant()) {
        return
      }

      if (dialogStore.state.isOpen) {
        timeout = setTimeout(
          showReminderWhenScreenIsFree,
          PREMIUM_REMINDER_DELAY_MS
        )

        return
      }

      snoozePremiumReminder()
      dialogStore.actions.showDialog('premium-reminder')
    }

    if (enabled) {
      timeout = setTimeout(
        showReminderWhenScreenIsFree,
        PREMIUM_REMINDER_DELAY_MS
      )
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [enabled, dialogStore])
}

import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  PREMIUM_REMINDER_DELAY_MS,
  PREMIUM_REMINDER_STORAGE_KEY
} from '~/constants/plan'
import { DAY } from '~/constants/time'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '~/lib/queries'
import { matchIsUserAdmin } from '~/lib/role'
import { matchIsDialogOpen, useDialog } from '~/stores/dialog.store'

const COOLDOWN_DAYS = 3
const COOLDOWN_MS = COOLDOWN_DAYS * DAY

type UsePremiumReminderParams = {
  enabled: boolean
}

export const snoozePremiumReminder = () => {
  localStorage.setItem(PREMIUM_REMINDER_STORAGE_KEY, String(Date.now()))
}

export const usePremiumReminder = ({ enabled }: UsePremiumReminderParams) => {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const matchIsReminderRelevant = () => {
      const user = queryClient.getQueryData(getAuthUserQueryOpts().queryKey)

      if (user && matchIsUserAdmin(user)) {
        return false
      }

      const subscription = queryClient.getQueryData(
        getActiveSubscriptionQueryOpts().queryKey
      )

      if (user && subscription) {
        return false
      }

      const snoozedAt = localStorage.getItem(PREMIUM_REMINDER_STORAGE_KEY)

      const isSnoozed =
        snoozedAt !== null && Date.now() - Number(snoozedAt) < COOLDOWN_MS

      return !isSnoozed
    }

    let timeout: ReturnType<typeof setTimeout> | null = null

    const showReminderWhenScreenIsFree = () => {
      if (!matchIsReminderRelevant()) {
        return
      }

      const dialogState = useDialog.getState()

      if (matchIsDialogOpen(dialogState)) {
        timeout = setTimeout(
          showReminderWhenScreenIsFree,
          PREMIUM_REMINDER_DELAY_MS
        )

        return
      }

      snoozePremiumReminder()
      dialogState.showDialog('premium-reminder', {})
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
  }, [enabled, queryClient])
}

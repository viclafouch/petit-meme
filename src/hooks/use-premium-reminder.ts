import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DAY } from '~/constants/time'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '~/lib/queries'
import { matchIsUserAdmin } from '~/lib/role'
import { matchIsDialogOpen, useDialog } from '~/stores/dialog.store'

const PREMIUM_REMINDER_STORAGE_KEY = 'premium-reminder-dismissed-at'
const COOLDOWN_MS = 3 * DAY
const DISPLAY_DELAY_MS = 5000

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

      return !(snoozedAt && Date.now() - Number(snoozedAt) < COOLDOWN_MS)
    }

    let timeout: ReturnType<typeof setTimeout> | null = null

    const showReminderWhenScreenIsFree = () => {
      if (!matchIsReminderRelevant()) {
        return
      }

      const dialogState = useDialog.getState()

      if (matchIsDialogOpen(dialogState)) {
        timeout = setTimeout(showReminderWhenScreenIsFree, DISPLAY_DELAY_MS)

        return
      }

      snoozePremiumReminder()
      dialogState.showDialog('premium-reminder', {})
    }

    if (enabled) {
      timeout = setTimeout(showReminderWhenScreenIsFree, DISPLAY_DELAY_MS)
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [enabled, queryClient])
}

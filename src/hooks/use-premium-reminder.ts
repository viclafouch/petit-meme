import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DAY } from '~/constants/time'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '~/lib/queries'
import { matchIsUserAdmin } from '~/lib/role'
import { useShowDialog } from '~/stores/dialog.store'

const PREMIUM_REMINDER_STORAGE_KEY = 'premium-reminder-dismissed-at'
const COOLDOWN_MS = 3 * DAY
const DISPLAY_DELAY_MS = 5000

type UsePremiumReminderParams = {
  enabled: boolean
}

export const usePremiumReminder = ({ enabled }: UsePremiumReminderParams) => {
  const queryClient = useQueryClient()
  const showDialog = useShowDialog()

  React.useEffect(() => {
    const matchShouldShow = () => {
      if (!enabled) {
        return false
      }

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

      const dismissedAt = localStorage.getItem(PREMIUM_REMINDER_STORAGE_KEY)

      return !(dismissedAt && Date.now() - Number(dismissedAt) < COOLDOWN_MS)
    }

    const timeout = matchShouldShow()
      ? setTimeout(() => {
          showDialog('premium-reminder', {})
        }, DISPLAY_DELAY_MS)
      : null

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [enabled, queryClient, showDialog])
}

export const dismissPremiumReminder = () => {
  localStorage.setItem(PREMIUM_REMINDER_STORAGE_KEY, String(Date.now()))
}

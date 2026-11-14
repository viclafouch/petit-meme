import { PREMIUM_REMINDER_STORAGE_KEY } from '~/constants/plan'

export const snoozePremiumReminder = () => {
  localStorage.setItem(PREMIUM_REMINDER_STORAGE_KEY, String(Date.now()))
}

export const readPremiumReminderSnoozedAt = () => {
  const snoozedAt = localStorage.getItem(PREMIUM_REMINDER_STORAGE_KEY)

  return snoozedAt === null ? null : Number(snoozedAt)
}

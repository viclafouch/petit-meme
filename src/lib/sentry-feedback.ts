import * as Sentry from '@sentry/tanstackstart-react'
import { m } from '~/paraglide/messages'

type FeedbackOptions = NonNullable<
  Parameters<typeof Sentry.feedbackIntegration>[0]
>

const getFeedbackOptions = (): FeedbackOptions => {
  return {
    colorScheme: 'system',
    autoInject: false,
    showBranding: false,
    showName: false,
    showEmail: true,
    isEmailRequired: false,
    enableScreenshot: true,
    triggerLabel: m.sentry_trigger_label(),
    triggerAriaLabel: m.sentry_trigger_aria(),
    formTitle: m.sentry_form_title(),
    submitButtonLabel: m.sentry_submit(),
    cancelButtonLabel: m.common_cancel(),
    confirmButtonLabel: m.common_confirm(),
    addScreenshotButtonLabel: m.sentry_add_screenshot(),
    removeScreenshotButtonLabel: m.sentry_remove_screenshot(),
    emailLabel: m.sentry_email_label(),
    emailPlaceholder: m.sentry_email_placeholder(),
    messageLabel: m.sentry_message_label(),
    messagePlaceholder: m.sentry_message_placeholder(),
    successMessageText: m.sentry_success(),
    isRequiredLabel: m.sentry_required(),
    themeLight: {
      accentBackground: 'oklch(0.205 0 0)',
      accentForeground: '#ffffff'
    },
    themeDark: {
      accentBackground: 'oklch(0.922 0 0)',
      accentForeground: '#000000'
    }
  }
}

const getOrAddFeedback = () => {
  const existingFeedback = Sentry.getFeedback()

  if (existingFeedback) {
    return existingFeedback
  }

  const feedback = Sentry.feedbackIntegration(getFeedbackOptions())
  Sentry.addIntegration(feedback)

  return feedback
}

export const attachFeedback = (node: HTMLElement) => {
  return getOrAddFeedback().attachTo(node)
}

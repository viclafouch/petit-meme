import React from 'react'
import { MessageSquarePlus } from 'lucide-react'
import * as motion from 'motion/react-m'
import { ClientOnly } from '@tanstack/react-router'
import { waitForSentry } from '~/lib/sentry-client'
import { m } from '~/paraglide/messages'

const APPEAR_DELAY_SECONDS = 3

const INITIAL_ANIMATION = { y: 20, opacity: 0 }

const APPEAR_ANIMATION = {
  y: 0,
  opacity: 1,
  transition: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 24,
    delay: APPEAR_DELAY_SECONDS
  }
}

const loadAttachFeedback = async () => {
  try {
    const sentryClient = await waitForSentry()

    if (!sentryClient) {
      return null
    }

    const { attachFeedback } = await import('~/lib/sentry-feedback')

    return attachFeedback
  } catch {
    return null
  }
}

const attachFeedbackOnceLoaded = async (
  node: HTMLButtonElement,
  signal: AbortSignal
) => {
  const attachFeedback = await loadAttachFeedback()

  if (!attachFeedback || signal.aborted) {
    return
  }

  signal.addEventListener('abort', attachFeedback(node), { once: true })
}

const feedbackRef = (node: HTMLButtonElement | null) => {
  if (!node) {
    return () => {}
  }

  const controller = new AbortController()

  void attachFeedbackOnceLoaded(node, controller.signal)

  return () => {
    controller.abort()
  }
}

const FeedbackWidgetInner = () => {
  return (
    <motion.button
      ref={feedbackRef}
      type="button"
      initial={INITIAL_ANIMATION}
      animate={APPEAR_ANIMATION}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="fixed right-4 bottom-[calc(var(--tab-bar-space)+1rem)] z-40 flex cursor-pointer items-center gap-2 rounded-full border border-border/40 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl sm:px-4 sm:py-2.5"
      aria-label={m.sentry_trigger_aria()}
    >
      <MessageSquarePlus className="size-4 shrink-0" />
      <span className="hidden sm:inline">{m.sentry_trigger_label()}</span>
    </motion.button>
  )
}

export const SentryFeedbackWidget = () => {
  return (
    <ClientOnly>
      <FeedbackWidgetInner />
    </ClientOnly>
  )
}

import React from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { motion } from 'motion/react'
import * as Sentry from '@sentry/tanstackstart-react'
import { ClientOnly } from '@tanstack/react-router'

const APPEAR_DELAY_SECONDS = 3

// eslint-disable-next-line id-length -- motion API requires single-letter axis properties (y)
const INITIAL_ANIMATION = { y: 20, opacity: 0 }

const APPEAR_ANIMATION = {
  // eslint-disable-next-line id-length -- motion API requires single-letter axis properties (y)
  y: 0,
  opacity: 1,
  transition: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 24,
    delay: APPEAR_DELAY_SECONDS
  }
}

const feedbackRef = (node: HTMLButtonElement | null) => {
  if (!node) {
    return () => {}
  }

  const feedback = Sentry.getFeedback()

  if (!feedback) {
    return () => {}
  }

  return feedback.attachTo(node)
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
      className="fixed right-4 bottom-4 z-40 flex cursor-pointer items-center gap-2 rounded-full border border-border/40 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl sm:px-4 sm:py-2.5"
      aria-label="Envoyer un feedback"
    >
      <MessageSquarePlus className="size-4 shrink-0" />
      <span className="hidden sm:inline">Feedback</span>
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

import type { MemeFullData } from '~/constants/meme'
import type { MemeFillSuggestion } from '~/constants/meme-fill-suggestion'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import {
  findTranslationByLocale,
  getRequiredLocales
} from '~/helpers/i18n-content'
import { matchIsFillInFlight } from '~/helpers/meme-fill'

const FILL_POLL_INTERVAL_MS = 5000

type MemeFillState = {
  status: MemeFillStatus
  suggestion: MemeFillSuggestion | null
  isStalled: boolean
  isQueuedTonight: boolean
}

export const resolveFillNotice = (fill: MemeFillState) => {
  if (fill.isQueuedTonight) {
    return fill.status === MemeFillStatus.WAITING
      ? 'QUEUED_TONIGHT'
      : 'RETRIED_TONIGHT'
  }

  if (fill.isStalled || fill.status === MemeFillStatus.FAILED) {
    return 'FAILED'
  }

  if (fill.status === MemeFillStatus.WAITING) {
    return 'WAITING_VIDEO'
  }

  if (fill.status === MemeFillStatus.RUNNING) {
    return 'RUNNING'
  }

  return fill.suggestion ? 'SUGGESTION_READY' : 'FILLED'
}

export type FillNotice = ReturnType<typeof resolveFillNotice>

export const resolveFillPollInterval = (fill: MemeFillState | undefined) => {
  if (!fill || !matchIsFillInFlight(fill.status) || fill.isStalled) {
    return false
  }

  return FILL_POLL_INTERVAL_MS
}

export const buildFillSuggestionFromMeme = (meme: MemeFullData) => {
  const suggestion: MemeFillSuggestion = {}

  for (const locale of getRequiredLocales(meme.contentLocale)) {
    const translation = findTranslationByLocale(meme.translations, locale)

    if (translation) {
      suggestion[locale] = {
        title: translation.title,
        description: translation.description,
        keywords: translation.keywords
      }
    }
  }

  return suggestion
}

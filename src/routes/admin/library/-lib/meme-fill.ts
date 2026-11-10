import type { MemeFullData } from '~/constants/meme'
import { MEME_FILL_MAX_DURATION_MS } from '~/constants/meme-fill'
import type { MemeFillSuggestion } from '~/constants/meme-fill-suggestion'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import {
  findTranslationByLocale,
  getRequiredLocales
} from '~/helpers/i18n-content'

const FILL_POLL_INTERVAL_MS = 5000

type MemeFillState = {
  status: MemeFillStatus
  updatedAt: Date
}

export const matchIsFillInFlight = (status: MemeFillStatus) => {
  return status === MemeFillStatus.WAITING || status === MemeFillStatus.RUNNING
}

export const matchIsFillStalled = (fill: MemeFillState, checkedAt: number) => {
  return (
    matchIsFillInFlight(fill.status) &&
    checkedAt - fill.updatedAt.getTime() > MEME_FILL_MAX_DURATION_MS
  )
}

export const resolveFillPollInterval = (
  fill: MemeFillState | undefined,
  checkedAt: number
) => {
  if (
    !fill ||
    !matchIsFillInFlight(fill.status) ||
    matchIsFillStalled(fill, checkedAt)
  ) {
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

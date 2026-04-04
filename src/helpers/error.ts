import { AI_SEARCH_QUOTA_EXCEEDED_MESSAGE } from '~/constants/ai-search'

const DEFAULT_ERROR_MESSAGE = "Une erreur s'est produite"

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return DEFAULT_ERROR_MESSAGE
}

export const matchIsRateLimitError = (error: unknown) => {
  return error instanceof Error && error.message.includes('Too Many Requests')
}

export const matchIsAiSearchQuotaExceeded = (error: unknown) => {
  return (
    error instanceof Error &&
    error.message.includes(AI_SEARCH_QUOTA_EXCEEDED_MESSAGE)
  )
}

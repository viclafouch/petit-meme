import { RATE_LIMIT_ERROR_MESSAGE } from '~/constants/rate-limit'

const DEFAULT_ERROR_MESSAGE = "Une erreur s'est produite"

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message !== '') {
    return error.message
  }

  return DEFAULT_ERROR_MESSAGE
}

export const matchIsRateLimitError = (error: unknown) => {
  return (
    error instanceof Error && error.message.includes(RATE_LIMIT_ERROR_MESSAGE)
  )
}

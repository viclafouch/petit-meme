const DEFAULT_ERROR_MESSAGE = "Une erreur s'est produite"

export const getErrorMessage = (error: unknown) => {
  if (Error.isError(error) && error.message) {
    return error.message
  }

  return DEFAULT_ERROR_MESSAGE
}

export const matchIsRateLimitError = (error: unknown) => {
  return Error.isError(error) && error.message.includes('Too Many Requests')
}

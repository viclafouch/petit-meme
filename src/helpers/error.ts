const DEFAULT_ERROR_MESSAGE = "Une erreur s'est produite"

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return DEFAULT_ERROR_MESSAGE
}

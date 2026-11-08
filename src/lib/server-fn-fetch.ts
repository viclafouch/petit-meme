import { type CustomFetch, X_TSS_SERIALIZED } from '@tanstack/react-start'
import { AppError } from '~/constants/error'
import { HTTP_STATUS } from '~/constants/http'

const matchIsEdgeRateLimit = (response: Response) => {
  return (
    response.status === HTTP_STATUS.TOO_MANY_REQUESTS &&
    !response.headers.has(X_TSS_SERIALIZED)
  )
}

export const serverFnFetch: CustomFetch = async (input, init) => {
  const response = await fetch(input, init)

  if (matchIsEdgeRateLimit(response)) {
    throw new AppError('rate_limited', { code: 'RATE_LIMITED' })
  }

  return response
}

import type * as Sentry from '@sentry/tanstackstart-react'
import { isNotFound, isRedirect } from '@tanstack/react-router'
import { getAppErrorCode } from '~/constants/error'

export const matchIsUnexpectedError = (error: unknown) => {
  return (
    getAppErrorCode(error) === undefined &&
    !isNotFound(error) &&
    !isRedirect(error)
  )
}

export const dropExpectedError = <TEvent extends Sentry.Event>(
  event: TEvent,
  hint: Sentry.EventHint
) => {
  return matchIsUnexpectedError(hint.originalException) ? event : null
}

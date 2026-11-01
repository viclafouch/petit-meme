import type * as Sentry from '@sentry/tanstackstart-react'
import { getAppErrorCode } from '~/constants/error'

export const dropExpectedError = <TEvent extends Sentry.Event>(
  event: TEvent,
  hint: Sentry.EventHint
) => {
  return getAppErrorCode(hint.originalException) === undefined ? event : null
}

import type React from 'react'
import { Resend, type ErrorResponse } from 'resend'
import { waitUntil } from '@vercel/functions'
import { serverEnv } from '~/env/server.server'
import { emailLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'

const DEFAULT_EMAIL_FROM = 'Petit Meme <noreply@petit-meme.io>'

let resendClient: Resend | null = null

const getResendClient = () => {
  resendClient ??= new Resend(serverEnv.RESEND_API_KEY)

  return resendClient
}

const getEmailFrom = () => {
  return serverEnv.EMAIL_OVERRIDE_FROM ?? DEFAULT_EMAIL_FROM
}

const getEmailRecipient = (email: string) => {
  return serverEnv.EMAIL_OVERRIDE_TO ?? email
}

const DUPLICATE_SEND_ERROR_NAMES = [
  'invalid_idempotent_request',
  'concurrent_idempotent_requests'
] as const satisfies readonly ErrorResponse['name'][]

const matchIsDuplicateSend = ({ name }: ErrorResponse) => {
  return DUPLICATE_SEND_ERROR_NAMES.some((duplicateSendErrorName) => {
    return duplicateSendErrorName === name
  })
}

type SendEmailInBackgroundParams = {
  to: string
  subject: string
  react: React.ReactElement
  logMessage: string
  idempotencyKey?: string
}

type SendEmailParams = Omit<SendEmailInBackgroundParams, 'logMessage'>

export const sendEmail = async ({
  to,
  subject,
  react,
  idempotencyKey
}: SendEmailParams) => {
  try {
    const { error } = await getResendClient().emails.send(
      {
        from: getEmailFrom(),
        to: getEmailRecipient(to),
        subject,
        react
      },
      { idempotencyKey }
    )

    if (error && matchIsDuplicateSend(error)) {
      emailLogger.info(
        { idempotencyKey, subject, to },
        'Email already sent for this idempotency key'
      )

      return true
    }

    if (error) {
      emailLogger.error({ error, subject, to }, 'Failed to send email')
      captureWithFeature(error, 'resend-email')

      return false
    }

    return true
  } catch (error) {
    emailLogger.error({ error, subject, to }, 'Unexpected error sending email')
    captureWithFeature(error, 'resend-email')

    return false
  }
}

export const sendEmailInBackground = ({
  logMessage,
  ...params
}: SendEmailInBackgroundParams) => {
  emailLogger.info({ to: params.to, subject: params.subject }, logMessage)

  waitUntil(sendEmail(params))
}

import type React from 'react'
import { Resend } from 'resend'
import { waitUntil } from '@vercel/functions'
import { serverEnv } from '~/env/server'
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

type SendEmailInBackgroundParams = {
  to: string
  subject: string
  react: React.ReactElement
  logMessage: string
}

type SendEmailParams = Omit<SendEmailInBackgroundParams, 'logMessage'>

export const sendEmail = async ({ to, subject, react }: SendEmailParams) => {
  try {
    const { error } = await getResendClient().emails.send({
      from: getEmailFrom(),
      to: getEmailRecipient(to),
      subject,
      react
    })

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
  to,
  subject,
  react,
  logMessage
}: SendEmailInBackgroundParams) => {
  emailLogger.info({ to, subject }, logMessage)

  waitUntil(sendEmail({ to, subject, react }))
}

import type React from 'react'
import { Resend } from 'resend'
import { serverEnv } from '~/env/server'
import { emailLogger } from '~/lib/logger'
import { captureWithFeature } from '~/lib/sentry'

const DEFAULT_EMAIL_FROM = 'Petit Meme <noreply@petit-meme.io>'

let resendClient: Resend | null = null

export const getResendClient = () => {
  resendClient ??= new Resend(serverEnv.RESEND_API_KEY)

  return resendClient
}

export const getEmailFrom = () => {
  return serverEnv.EMAIL_OVERRIDE_FROM ?? DEFAULT_EMAIL_FROM
}

export const getEmailRecipient = (email: string) => {
  return serverEnv.EMAIL_OVERRIDE_TO ?? email
}

type SendEmailAsyncParams = {
  to: string
  subject: string
  react: React.ReactElement
  logMessage: string
}

type SendEmailParams = Omit<SendEmailAsyncParams, 'logMessage'>

const sendEmail = async ({ to, subject, react }: SendEmailParams) => {
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
    }
  } catch (error) {
    emailLogger.error({ error, subject, to }, 'Network error sending email')
    captureWithFeature(error, 'resend-email')
  }
}

export const sendEmailAsync = ({
  to,
  subject,
  react,
  logMessage
}: SendEmailAsyncParams) => {
  emailLogger.info({ to, subject }, logMessage)

  void sendEmail({ to, subject, react })
}

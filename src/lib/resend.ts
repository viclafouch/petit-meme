import type React from 'react'
import { Resend } from 'resend'
import { serverEnv } from '@/env/server'
import { emailLogger } from '@/lib/logger'

export const resend = new Resend(serverEnv.RESEND_API_KEY)

export const EMAIL_FROM =
  serverEnv.EMAIL_OVERRIDE_FROM ?? 'Petit Meme <noreply@petit-meme.io>'

export const getEmailRecipient = (email: string) => {
  return serverEnv.EMAIL_OVERRIDE_TO ?? email
}

type SendEmailAsyncParams = {
  to: string
  subject: string
  react: React.ReactElement
  logMessage: string
}

export const sendEmailAsync = ({
  to,
  subject,
  react,
  logMessage
}: SendEmailAsyncParams) => {
  emailLogger.info({ to, subject }, logMessage)

  resend.emails
    .send({
      from: EMAIL_FROM,
      to: getEmailRecipient(to),
      subject,
      react
    })
    .then(({ error }) => {
      if (error) {
        emailLogger.error({ err: error, subject, to }, 'Failed to send email')
      }
    })
    .catch((error: unknown) => {
      emailLogger.error(
        { err: error, subject, to },
        'Network error sending email'
      )
    })
}

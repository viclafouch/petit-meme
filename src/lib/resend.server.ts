import type React from 'react'
import { Resend } from 'resend'
import { serverEnv } from '@/env/server'
import { maskEmail } from '@/helpers/mask-email'

const resend = new Resend(serverEnv.RESEND_API_KEY)

const EMAIL_FROM =
  serverEnv.EMAIL_OVERRIDE_FROM ?? 'Petit Meme <noreply@petit-meme.io>'

const getEmailRecipient = (email: string) => {
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
  const maskedTo = maskEmail(to)

  // eslint-disable-next-line no-console
  console.log(`[email] ${logMessage} ${maskedTo}`)

  resend.emails
    .send({
      from: EMAIL_FROM,
      to: getEmailRecipient(to),
      subject,
      react
    })
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error(
          `[email] Failed to send "${subject}" to ${maskedTo}:`,
          error
        )
      }
    })
    .catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error(
        `[email] Network error sending "${subject}" to ${maskedTo}:`,
        error
      )
    })
}

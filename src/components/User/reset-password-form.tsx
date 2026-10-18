import { CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { LoadingButton } from '~/components/ui/loading-button'
import { getEmailSchema } from '~/constants/auth'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '~/helpers/auth-errors'
import { useAppForm } from '~/hooks/use-app-form'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { authClient } from '~/lib/auth-client'
import { focusFirstInvalidField } from '~/lib/form'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { localizeHref } from '~/paraglide/runtime'

const getResetPasswordSchema = () => {
  return z.object({
    email: getEmailSchema()
  })
}

const getResetPasswordFormOpts = () => {
  return formOptions({
    defaultValues: {
      email: ''
    },
    validators: {
      onChange: getResetPasswordSchema()
    }
  })
}

export const ResetPasswordForm = () => {
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: localizeHref('/password/create-new')
      })

      if (error) {
        throw new Error(extractAuthErrorCode(error))
      }
    },
    onError: (error) => {
      captureWithFeature(error, 'request-password-reset')
    },
    onSuccess: () => {
      form.reset()
    }
  })

  const errorRef = useErrorFocus(resetPasswordMutation.error)

  const form = useAppForm({
    ...getResetPasswordFormOpts(),
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: ({ value }) => {
      resetPasswordMutation.mutate({ email: value.email })
    }
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      noValidate
      className="flex flex-col items-center gap-y-6 w-full"
    >
      <h1 className="text-xl font-semibold text-center text-balance max-w-sm mx-center">
        {m.auth_reset_password_heading()}
      </h1>
      <div className="flex flex-col items-center gap-y-4 w-full">
        <form.AppField
          name="email"
          children={(field) => {
            return (
              <field.TextField
                label={m.common_email()}
                required
                type="email"
                autoComplete="email"
                placeholder={m.auth_email_placeholder()}
              />
            )
          }}
        />
        <LoadingButton
          isLoading={resetPasswordMutation.isPending}
          type="submit"
          className="w-full"
        >
          {m.common_confirm()}
        </LoadingButton>
        {resetPasswordMutation.error ? (
          <Alert
            ref={errorRef}
            variant="destructive"
            role="alert"
            tabIndex={-1}
          >
            <CircleAlert aria-hidden="true" />
            <AlertDescription className="text-destructive-foreground">
              {getAuthErrorMessage(resetPasswordMutation.error.message)}
            </AlertDescription>
          </Alert>
        ) : null}
        {resetPasswordMutation.isSuccess ? (
          <Alert variant="success" className="mt-4">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>{m.auth_reset_email_sent_title()}</AlertTitle>
            <AlertDescription>
              {m.auth_reset_email_sent_description()}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </form>
  )
}

import { CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { LoadingButton } from '~/components/ui/loading-button'
import { getEmailSchema } from '~/constants/auth'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '~/helpers/auth-errors'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { authClient } from '~/lib/auth-client'
import { captureWithFeature } from '~/lib/sentry'
import { getFieldErrorMessage } from '~/lib/utils'
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

  const form = useForm({
    ...getResetPasswordFormOpts(),
    onSubmit: async ({ value }) => {
      return resetPasswordMutation.mutateAsync({ email: value.email })
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
        <form.Field
          name="email"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>{m.common_email()}</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    placeholder={m.auth_email_placeholder()}
                    name="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      return field.handleChange(event.target.value)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <form.Subscribe
          selector={(state) => {
            return state.isSubmitting
          }}
          children={(isSubmitting) => {
            return (
              <LoadingButton
                isLoading={isSubmitting}
                type="submit"
                className="w-full"
              >
                {m.common_confirm()}
              </LoadingButton>
            )
          }}
        />
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

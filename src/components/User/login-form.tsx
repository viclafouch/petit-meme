import React from 'react'
import { CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { LoadingButton } from '~/components/ui/loading-button'
import { LastLoginBadge } from '~/components/User/last-login-badge'
import { getEmailSchema } from '~/constants/auth'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '~/helpers/auth-errors'
import { useAppForm } from '~/hooks/use-app-form'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { useResetAccountData } from '~/hooks/use-reset-account-data'
import { authClient } from '~/lib/auth-client'
import { focusFirstInvalidField } from '~/lib/form'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'

type LoginFormProps = {
  lastLoginMethod: string | null
  onOpenChange?: (open: boolean) => void
}

const getLoginSchema = () => {
  return z.object({
    email: getEmailSchema(),
    password: z.string().min(1, { error: m.validation_required() })
  })
}

const getLoginFormOpts = () => {
  return formOptions({
    defaultValues: {
      email: '',
      password: ''
    },
    validators: {
      onChange: getLoginSchema()
    }
  })
}

export const LoginForm = ({
  onOpenChange,
  lastLoginMethod
}: LoginFormProps) => {
  const resetAccountData = useResetAccountData()

  const signInMutation = useMutation({
    mutationFn: async ({
      email,
      password
    }: {
      email: string
      password: string
    }) => {
      const { error } = await authClient.signIn.email({
        email,
        password
      })

      if (error) {
        throw new Error(extractAuthErrorCode(error))
      }
    },
    onError: (error) => {
      captureWithFeature(error, 'sign-in')
    },
    onSuccess: async () => {
      await resetAccountData()

      onOpenChange?.(false)
    }
  })

  const errorRef = useErrorFocus(signInMutation.error)

  const isEmailNotVerified =
    signInMutation.error?.message === 'EMAIL_NOT_VERIFIED'

  const form = useAppForm({
    ...getLoginFormOpts(),
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: ({ value }) => {
      signInMutation.mutate({
        email: value.email,
        password: value.password
      })
    }
  })

  const isLastLoginEmail = lastLoginMethod === 'email'

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      noValidate
      className="flex flex-col items-center gap-y-4 w-full"
    >
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
      <form.AppField
        name="password"
        children={(field) => {
          return (
            <field.TextField
              label={m.common_password()}
              required
              type="password"
              autoComplete="current-password"
              placeholder="******"
            />
          )
        }}
      />
      <div className="w-full flex justify-end">
        <Link
          to="/password/reset"
          className="underline text-xs text-muted-foreground py-2"
          onClick={() => {
            return onOpenChange?.(false)
          }}
        >
          {m.auth_forgot_password()}
        </Link>
      </div>
      <LoadingButton
        isLoading={signInMutation.isPending}
        type="submit"
        className="w-full relative"
      >
        {m.nav_sign_in()}
        {isLastLoginEmail ? <LastLoginBadge /> : null}
      </LoadingButton>
      {signInMutation.error && !isEmailNotVerified ? (
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            {getAuthErrorMessage(signInMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
      {isEmailNotVerified ? (
        <Alert variant="destructive" role="alert">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>{m.auth_email_not_verified_title()}</AlertTitle>
          <AlertDescription>
            {m.auth_email_not_verified_description()}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

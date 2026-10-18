import { CircleCheckBig, CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { LoadingButton } from '~/components/ui/loading-button'
import {
  getEmailSchema,
  getPasswordWithConfirmationSchema
} from '~/constants/auth'
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

const getSignupSchema = () => {
  return z
    .object({
      name: z.string().min(1, { error: m.validation_name_required() }),
      email: getEmailSchema(),
      acceptTerms: z.literal(true, {
        error: m.validation_accept_terms()
      })
    })
    .and(getPasswordWithConfirmationSchema())
}

const getSignupFormOpts = () => {
  return formOptions({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    },
    validators: {
      onChange: getSignupSchema()
    }
  })
}

const SignupSuccessAlert = () => {
  return (
    <Alert variant="success" className="mt-4">
      <CircleCheckBig aria-hidden="true" />
      <AlertTitle>{m.auth_signup_success_title()}</AlertTitle>
      <AlertDescription>{m.auth_signup_success_description()}</AlertDescription>
    </Alert>
  )
}

export const SignupForm = () => {
  const signupMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      name
    }: {
      email: string
      password: string
      name: string
    }) => {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: localizeHref('/')
      })

      if (error) {
        throw new Error(extractAuthErrorCode(error))
      }
    },
    onError: (error) => {
      captureWithFeature(error, 'sign-up')
    },
    onSuccess: async () => {
      form.reset()
    }
  })

  const errorRef = useErrorFocus(signupMutation.error)

  const form = useAppForm({
    ...getSignupFormOpts(),
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: ({ value }) => {
      signupMutation.mutate({
        email: value.email,
        password: value.password,
        name: value.name
      })
    }
  })

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
        name="name"
        children={(field) => {
          return (
            <field.TextField
              label={m.auth_username()}
              required
              type="text"
              autoComplete="name"
              placeholder={m.auth_name_placeholder()}
            />
          )
        }}
      />
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
              autoComplete="new-password"
              placeholder="******"
            />
          )
        }}
      />
      <form.AppField
        name="confirmPassword"
        children={(field) => {
          return (
            <field.TextField
              label={m.auth_confirm_password()}
              required
              type="password"
              autoComplete="new-password"
              placeholder="******"
            />
          )
        }}
      />
      <form.AppField
        name="acceptTerms"
        children={(field) => {
          return (
            <field.CheckboxField
              label={
                <>
                  {m.auth_accept_terms_prefix()}
                  <Link
                    to="/terms-of-use"
                    className="text-info underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.auth_terms_link_text()}
                  </Link>
                  {m.auth_accept_terms_and()}
                  <Link
                    to="/privacy"
                    className="text-info underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.auth_privacy_link_text()}
                  </Link>
                </>
              }
            />
          )
        }}
      />
      <LoadingButton
        isLoading={signupMutation.isPending}
        type="submit"
        className="w-full"
      >
        {m.auth_create_account()}
      </LoadingButton>
      {signupMutation.error ? (
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-destructive-foreground">
            {getAuthErrorMessage(signupMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
      {signupMutation.isSuccess ? <SignupSuccessAlert /> : null}
    </form>
  )
}

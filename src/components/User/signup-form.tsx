import { CheckCircle, CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Checkbox } from '~/components/ui/checkbox'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { LoadingButton } from '~/components/ui/loading-button'
import {
  getEmailSchema,
  getPasswordWithConfirmationSchema
} from '~/constants/auth'
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

const getSignupSchema = () => {
  return z
    .object({
      name: z.string().min(1, { message: m.validation_name_required() }),
      email: getEmailSchema(),
      acceptTerms: z.literal(true, {
        message: m.validation_accept_terms()
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
      acceptTerms: false as boolean
    },
    validators: {
      onChange: getSignupSchema()
    }
  })
}

const SignupSuccessAlert = () => {
  return (
    <Alert variant="success" className="mt-4">
      <CheckCircle aria-hidden="true" />
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

  const form = useForm({
    ...getSignupFormOpts(),
    onSubmit: async ({ value }) => {
      return signupMutation.mutateAsync({
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
      <form.Field
        name="name"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>{m.auth_username()}</FormLabel>
              <FormControl>
                <Input
                  required
                  type="text"
                  autoComplete="name"
                  placeholder={m.auth_name_placeholder()}
                  name="name"
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
      <form.Field
        name="password"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>{m.common_password()}</FormLabel>
              <FormControl>
                <Input
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="******"
                  name="password"
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
      <form.Field
        name="confirmPassword"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>{m.auth_confirm_password()}</FormLabel>
              <FormControl>
                <Input
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="******"
                  name="confirmPassword"
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
      <form.Field
        name="acceptTerms"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage} className="w-full">
              <div className="flex items-start gap-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={field.state.value === true}
                  onCheckedChange={(checked) => {
                    return field.handleChange(checked === true)
                  }}
                  onBlur={field.handleBlur}
                />
                <label
                  htmlFor="acceptTerms"
                  className="text-xs text-muted-foreground leading-snug"
                >
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
                </label>
              </div>
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
              {m.auth_create_account()}
            </LoadingButton>
          )
        }}
      />
      {signupMutation.error ? (
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-destructive-foreground">
            {getAuthErrorMessage(signupMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitted
        }}
        children={(isSubmitted) => {
          return isSubmitted && signupMutation.isSuccess ? (
            <SignupSuccessAlert />
          ) : null
        }}
      />
    </form>
  )
}

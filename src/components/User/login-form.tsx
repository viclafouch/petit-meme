import React from 'react'
import { CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { LoadingButton } from '~/components/ui/loading-button'
import { LastLoginBadge } from '~/components/User/last-login-badge'
import { getEmailSchema } from '~/constants/auth'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '~/helpers/auth-errors'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { authClient } from '~/lib/auth-client'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { getFieldErrorMessage } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

type LoginFormParams = {
  onOpenChange?: (open: boolean) => void
  lastLoginMethod: string | null
}

const getLoginSchema = () => {
  return z.object({
    email: getEmailSchema(),
    password: z.string().min(1, { message: m.validation_required() })
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
}: LoginFormParams) => {
  const router = useRouter()
  const queryClient = useQueryClient()

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
      await queryClient.invalidateQueries(getAuthUserQueryOpts())
      await router.invalidate({ sync: true })
      await queryClient.invalidateQueries(getActiveSubscriptionQueryOpts())

      onOpenChange?.(false)
    }
  })

  const errorRef = useErrorFocus(signInMutation.error)

  const matchIsEmailNotVerified =
    signInMutation.error?.message === 'EMAIL_NOT_VERIFIED'

  const form = useForm({
    ...getLoginFormOpts(),
    onSubmit: async ({ value }) => {
      return signInMutation.mutateAsync({
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
                  autoComplete="current-password"
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
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitting
        }}
        children={(isSubmitting) => {
          return (
            <LoadingButton
              isLoading={isSubmitting}
              type="submit"
              className="w-full relative"
            >
              {m.nav_sign_in()}
              {isLastLoginEmail ? <LastLoginBadge /> : null}
            </LoadingButton>
          )
        }}
      />
      {signInMutation.error && !matchIsEmailNotVerified ? (
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            {getAuthErrorMessage(signInMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
      {matchIsEmailNotVerified ? (
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

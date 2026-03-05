import React from 'react'
import { CircleAlert, Twitter } from 'lucide-react'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '@/helpers/auth-errors'
import { authClient } from '@/lib/auth-client'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts
} from '@/lib/queries'
import { captureWithFeature } from '@/lib/sentry'
import { getFieldErrorMessage } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'

type LoginFormParams = {
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  onTwitterSignIn: (event: React.MouseEvent<HTMLButtonElement>) => void
  onAuthTypeChange: (authType: 'login' | 'signup') => void
}

const loginSchema = z.object({
  email: z.string(),
  password: z.string()
})

const loginFormOpts = formOptions({
  defaultValues: {
    email: '',
    password: ''
  },
  validators: {
    onChange: loginSchema
  }
})

export const LoginForm = ({
  onOpenChange,
  onSuccess,
  onAuthTypeChange,
  onTwitterSignIn
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

      onSuccess?.()
    }
  })

  const matchIsEmailNotVerified =
    signInMutation.error?.message === 'EMAIL_NOT_VERIFIED'

  const form = useForm({
    ...loginFormOpts,
    onSubmit: async ({ value }) => {
      return signInMutation.mutateAsync({
        email: value.email,
        password: value.password
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
              {m.nav_sign_in()}
            </LoadingButton>
          )
        }}
      />
      {signInMutation.error && !matchIsEmailNotVerified ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>
            {getAuthErrorMessage(signInMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t w-full">
        <span className="bg-background text-muted-foreground relative z-10 px-2">
          {m.auth_or_continue_with()}
        </span>
      </div>
      <Button variant="outline" className="w-full" onClick={onTwitterSignIn}>
        <Twitter />
        {m.auth_twitter_sign_in()}
      </Button>
      <div className="w-full flex flex-col gap-1 justify-center items-center">
        <Link
          to="/password/reset"
          className="underline text-xs text-primary"
          onClick={() => {
            return onOpenChange?.(false)
          }}
        >
          {m.auth_forgot_password()}
        </Link>
        <div className="text-center text-sm gap-x-1 inline-flex justify-center w-full text-primary">
          {m.auth_no_account()}
          <button
            onClick={(event) => {
              event.preventDefault()
              onAuthTypeChange('signup')
            }}
            type="button"
            className="underline underline-offset-4 cursor-pointer"
          >
            {m.auth_sign_up()}
          </button>
        </div>
      </div>
      {matchIsEmailNotVerified ? (
        <Alert variant="destructive" className="mt-4">
          <CircleAlert />
          <AlertTitle>{m.auth_email_not_verified_title()}</AlertTitle>
          <AlertDescription>
            {m.auth_email_not_verified_description()}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

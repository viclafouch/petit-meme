import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Alert, AlertDescription } from '~/components/ui/alert'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { LoadingButton } from '~/components/ui/loading-button'
import { getPasswordWithConfirmationSchema } from '~/constants/auth'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '~/helpers/auth-errors'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { authClient } from '~/lib/auth-client'
import { captureWithFeature } from '~/lib/sentry'
import { getFieldErrorMessage } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

const getCreateNewPasswordFormOpts = () => {
  return formOptions({
    defaultValues: {
      password: '',
      confirmPassword: ''
    },
    validators: {
      onChange: getPasswordWithConfirmationSchema()
    }
  })
}

export const CreateNewPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter()

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await authClient.resetPassword({
        newPassword,
        token
      })

      if (error) {
        throw new Error(extractAuthErrorCode(error))
      }
    },
    onError: (error) => {
      captureWithFeature(error, 'reset-password')
    },
    onSuccess: () => {
      toast.success(m.auth_password_changed_toast())
      void router.navigate({ to: '/' })
    }
  })

  const errorRef = useErrorFocus(resetPasswordMutation.error)

  const form = useForm({
    ...getCreateNewPasswordFormOpts(),
    onSubmit: async ({ value }) => {
      return resetPasswordMutation.mutateAsync({
        newPassword: value.password
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
      <h1 className="text-xl font-semibold text-center text-balance">
        {m.auth_create_new_password_heading()}
      </h1>
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
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-destructive-foreground">
            {getAuthErrorMessage(resetPasswordMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

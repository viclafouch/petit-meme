import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { formOptions } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { LoadingButton } from '~/components/ui/loading-button'
import { getPasswordWithConfirmationSchema } from '~/constants/auth'
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

type CreateNewPasswordFormProps = {
  token: string
}

export const CreateNewPasswordForm = ({
  token
}: CreateNewPasswordFormProps) => {
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

  const form = useAppForm({
    ...getCreateNewPasswordFormOpts(),
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: ({ value }) => {
      resetPasswordMutation.mutate({ newPassword: value.password })
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
      <LoadingButton
        isLoading={resetPasswordMutation.isPending}
        type="submit"
        className="w-full"
      >
        {m.common_confirm()}
      </LoadingButton>
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

import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { LoadingButton } from '~/components/ui/loading-button'
import { getAuthErrorMessage } from '~/helpers/auth-errors'
import { useAppForm } from '~/hooks/use-app-form'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { useResetAccountData } from '~/hooks/use-reset-account-data'
import { focusFirstInvalidField } from '~/lib/form'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'
import { verifyEmail } from '~/server/email-verification'

const getVerifyEmailFormOpts = () => {
  return formOptions({
    defaultValues: {
      password: ''
    },
    validators: {
      onChange: z.object({
        password: z.string().min(1, { error: m.validation_required() })
      })
    }
  })
}

type VerifyEmailFormProps = {
  token: string
}

export const VerifyEmailForm = ({ token }: VerifyEmailFormProps) => {
  const router = useRouter()
  const resetAccountData = useResetAccountData()

  const verifyEmailMutation = useMutation({
    mutationFn: ({ password }: { password: string }) => {
      return verifyEmail({ data: { token, password } })
    },
    onError: (error) => {
      captureWithFeature(error, 'verify-email')
    },
    onSuccess: async () => {
      toast.success(m.auth_verify_email_success_toast())
      await resetAccountData()
      await router.navigate({ to: '/' })
    }
  })

  const errorRef = useErrorFocus(verifyEmailMutation.error)

  const form = useAppForm({
    ...getVerifyEmailFormOpts(),
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: ({ value }) => {
      verifyEmailMutation.mutate({ password: value.password })
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
        {m.auth_verify_email_heading()}
      </h1>
      <p className="text-sm text-muted-foreground text-center text-pretty">
        {m.auth_verify_email_description()}
      </p>
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
        >
          {m.auth_forgot_password()}
        </Link>
      </div>
      <LoadingButton
        isLoading={verifyEmailMutation.isPending}
        type="submit"
        className="w-full"
      >
        {m.auth_verify_email_submit()}
      </LoadingButton>
      {verifyEmailMutation.error ? (
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-destructive-foreground">
            {getAuthErrorMessage(verifyEmailMutation.error.message)}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

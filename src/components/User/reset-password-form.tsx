import { CircleAlert } from 'lucide-react'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { captureWithFeature } from '@/lib/sentry'
import { getFieldErrorMessage } from '@/lib/utils'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'

const resetPasswordSchema = z.object({
  email: z.email()
})

const resetPasswordFormOpts = formOptions({
  defaultValues: {
    email: ''
  },
  validators: {
    onChange: resetPasswordSchema
  }
})

export const ResetPasswordForm = () => {
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/password/create-new'
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

  const form = useForm({
    ...resetPasswordFormOpts,
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
        Demande de réinitialisation de mot de passe
      </h1>
      <div className="flex flex-col items-center gap-y-4 w-full">
        <form.Field
          name="email"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="jean@dupont.fr"
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
                Confirmer
              </LoadingButton>
            )
          }}
        />
        {resetPasswordMutation.error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>
              {getAuthErrorMessage(resetPasswordMutation.error.message)}
            </AlertDescription>
          </Alert>
        ) : null}
        {resetPasswordMutation.isSuccess ? (
          <Alert variant="success" className="mt-4">
            <CircleAlert />
            <AlertTitle>Vérifiez votre email !</AlertTitle>
            <AlertDescription>
              C'est tout bon ! Si nous trouvons un compte associé à cette
              adresse e-mail, vous recevrez d'ici quelques minutes un lien pour
              réinitialiser votre mot de passe.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </form>
  )
}

import React from 'react'
import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { passwordWithConfirmationSchema } from '@/constants/auth'
import { getAuthErrorMessage } from '@/helpers/auth-errors'
import { authClient } from '@/lib/auth-client'
import { getFieldErrorMessage } from '@/lib/utils'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

const createNewPasswordFormOpts = formOptions({
  defaultValues: {
    password: '',
    confirmPassword: ''
  },
  validators: {
    onChange: passwordWithConfirmationSchema
  }
})

export const CreateNewPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter()

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await authClient.resetPassword({
        newPassword,
        token
      })

      if (error) {
        throw new Error(error.code)
      }
    },
    onSuccess: () => {
      toast.success('Votre mot de passe a bien été modifié !')
      void router.navigate({ to: '/' })
    }
  })

  const form = useForm({
    ...createNewPasswordFormOpts,
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
        Créer un nouveau mot de passe
      </h1>
      <form.Field
        name="password"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>Mot de passe</FormLabel>
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
              <FormLabel>Confirmer le mot de passe</FormLabel>
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
    </form>
  )
}

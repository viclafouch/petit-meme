import React from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { authClient, getErrorMessage } from '@/lib/auth-client'
import { getFieldErrorMessage } from '@/lib/utils'
import { formOptions, useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'

const createNewPasswordForm = z
  .object({
    password: z.string(),
    confirmPassword: z.string()
  })
  .refine(
    (data) => {
      return data.password === data.confirmPassword
    },
    {
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword']
    }
  )

const createNewPasswordFormOpts = formOptions({
  defaultValues: {
    password: '',
    confirmPassword: ''
  },
  validators: {
    onChange: createNewPasswordForm
  }
})

export const CreateNewPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter()

  const form = useForm({
    ...createNewPasswordFormOpts,
    onSubmit: async ({ value }) => {
      const { error } = await authClient.resetPassword({
        newPassword: value.password,
        token
      })

      if (error) {
        toast.error(getErrorMessage(error, 'fr'))

        return
      }

      void router.navigate({ to: '/' })
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
    </form>
  )
}

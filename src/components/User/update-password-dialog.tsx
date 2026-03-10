import type { User } from 'better-auth'
import { CircleAlert } from 'lucide-react'
import { z } from 'zod'
import type { WithDialog } from '@/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/animate-ui/radix/dialog'
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
  getChangePasswordErrorMessage
} from '@/helpers/auth-errors'
import { useErrorFocus } from '@/hooks/use-error-focus'
import { authClient } from '@/lib/auth-client'
import { captureWithFeature } from '@/lib/sentry'
import { getFieldErrorMessage } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'

const getUpdatePasswordSchema = () => {
  return z
    .object({
      currentPassword: z.string().nonempty(),
      newPassword: z.string().min(4),
      confirmPassword: z.string().min(4)
    })
    .refine(
      (data) => {
        return data.newPassword === data.confirmPassword
      },
      {
        message: m.validation_passwords_dont_match(),
        path: ['confirmPassword']
      }
    )
}

const getUpdatePasswordFormOpts = () => {
  return formOptions({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validators: {
      onChange: getUpdatePasswordSchema()
    }
  })
}

const UpdatePasswordForm = () => {
  const updatePasswordMutation = useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword
    }: {
      currentPassword: string
      newPassword: string
    }) => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword
      })

      if (error) {
        throw new Error(extractAuthErrorCode(error))
      }
    },
    onError: (error) => {
      captureWithFeature(error, 'update-password')
    },
    onSuccess: () => {
      form.reset()
    }
  })

  const errorRef = useErrorFocus(updatePasswordMutation.error)

  const form = useForm({
    ...getUpdatePasswordFormOpts(),
    onSubmit: async ({ value }) => {
      return updatePasswordMutation.mutateAsync({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword
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
      className="flex flex-col items-center gap-y-6 w-full"
    >
      <div className="flex flex-col items-center gap-y-4 w-full">
        <form.Field
          name="currentPassword"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>{m.auth_current_password()}</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="password"
                    autoComplete="current-password"
                    placeholder="******"
                    name="current-password"
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
          name="newPassword"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>{m.auth_new_password()}</FormLabel>
                <FormControl>
                  <Input
                    required
                    type="password"
                    autoComplete="new-password"
                    placeholder="*******"
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
                {m.auth_update()}
              </LoadingButton>
            )
          }}
        />
        {updatePasswordMutation.error ? (
          <Alert
            ref={errorRef}
            variant="destructive"
            role="alert"
            tabIndex={-1}
          >
            <CircleAlert />
            <AlertDescription className="text-destructive-foreground">
              {getChangePasswordErrorMessage(
                updatePasswordMutation.error.message
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        <form.Subscribe
          selector={(state) => {
            return state.isSubmitted
          }}
          children={(isSubmitted) => {
            return isSubmitted && updatePasswordMutation.isSuccess ? (
              <Alert variant="success" className="mt-4">
                <CircleAlert />
                <AlertTitle>{m.auth_password_updated_title()}</AlertTitle>
                <AlertDescription>
                  {m.auth_password_updated_description()}
                </AlertDescription>
              </Alert>
            ) : null
          }}
        />
      </div>
    </form>
  )
}

export const UpdatePasswordDialog = ({
  open,
  onOpenChange
}: WithDialog<{ user: User }>) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{m.settings_change_password()}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div>
          <UpdatePasswordForm />
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}

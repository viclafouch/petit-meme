import type { User } from 'better-auth'
import { CircleAlert, MessageCircleWarning } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { WithDialog } from '~/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/animate-ui/radix/dialog'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { LoadingButton } from '~/components/ui/loading-button'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '~/helpers/auth-errors'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { authClient } from '~/lib/auth-client'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts,
  getFavoritesMemesQueryOpts
} from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { getFieldErrorMessage } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

const deleteAccountSchema = z.object({
  currentPassword: z.string().nonempty()
})

const deleteAccountFormOpts = formOptions({
  defaultValues: {
    currentPassword: ''
  },
  validators: {
    onChange: deleteAccountSchema
  }
})

const DeleteAccountForm = ({ onCancel }: { onCancel: () => void }) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const deleteAccountMutation = useMutation({
    mutationFn: async ({ currentPassword }: { currentPassword: string }) => {
      const { error } = await authClient.deleteUser({
        password: currentPassword
      })

      if (error) {
        throw new Error(extractAuthErrorCode(error))
      }
    },
    onError: (error) => {
      captureWithFeature(error, 'delete-account')
    },
    onSuccess: async () => {
      queryClient.removeQueries(getAuthUserQueryOpts())
      queryClient.removeQueries(getActiveSubscriptionQueryOpts())
      queryClient.removeQueries(getFavoritesMemesQueryOpts())
      toast.success(m.auth_account_deleted_toast())
      void router.navigate({ to: '/', from: '/' })
      await router.invalidate()
    }
  })

  const errorRef = useErrorFocus(deleteAccountMutation.error)

  const form = useForm(deleteAccountFormOpts)

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
        <form.Subscribe
          selector={(state) => {
            return [state.isSubmitted, state.values.currentPassword] as const
          }}
          children={([isSubmitted, currentPassword]) => {
            return isSubmitted ? (
              <div className="flex flex-col items-center gap-y-4 w-full">
                <Alert variant="default">
                  <MessageCircleWarning />
                  <AlertDescription>
                    {m.auth_delete_confirm_warning()}
                  </AlertDescription>
                </Alert>
                <LoadingButton
                  isLoading={deleteAccountMutation.isPending}
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (deleteAccountMutation.isPending) {
                      return
                    }

                    deleteAccountMutation.mutate({ currentPassword })
                  }}
                >
                  {m.auth_confirm_deletion()}
                </LoadingButton>
                <Button
                  variant="default"
                  type="button"
                  className="w-full"
                  onClick={() => {
                    onCancel()
                  }}
                >
                  {m.common_cancel()}
                </Button>
                {deleteAccountMutation.error ? (
                  <Alert
                    ref={errorRef}
                    variant="destructive"
                    role="alert"
                    tabIndex={-1}
                  >
                    <CircleAlert aria-hidden="true" />
                    <AlertDescription className="text-destructive-foreground">
                      {getAuthErrorMessage(deleteAccountMutation.error.message)}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : (
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
                <Button type="submit" variant="destructive" className="w-full">
                  {m.auth_delete()}
                </Button>
              </div>
            )
          }}
        />
      </div>
    </form>
  )
}

export const DeleteAccountDialog = ({
  open,
  onOpenChange
}: WithDialog<{ user: User }>) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{m.settings_delete_account()}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div>
          <DeleteAccountForm
            onCancel={() => {
              return onOpenChange(false)
            }}
          />
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}

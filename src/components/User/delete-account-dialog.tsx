import type { User } from 'better-auth'
import { CircleAlert, MessageCircleWarning } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
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
import { LoadingButton } from '~/components/ui/loading-button'
import {
  extractAuthErrorCode,
  getAuthErrorMessage
} from '~/helpers/auth-errors'
import { useAppForm } from '~/hooks/use-app-form'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { authClient } from '~/lib/auth-client'
import { focusFirstInvalidField } from '~/lib/form'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts,
  getFavoritesMemesQueryOpts
} from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages.js'

const getDeleteAccountSchema = () => {
  return z.object({
    currentPassword: z.string().min(1, { error: m.validation_required() })
  })
}

const getDeleteAccountFormOpts = () => {
  return formOptions({
    defaultValues: {
      currentPassword: ''
    },
    validators: {
      onChange: getDeleteAccountSchema()
    }
  })
}

type DeleteAccountFormProps = {
  onCancel: () => void
}

const DeleteAccountForm = ({ onCancel }: DeleteAccountFormProps) => {
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

  const form = useAppForm({
    ...getDeleteAccountFormOpts(),
    onSubmitInvalid: focusFirstInvalidField
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
                <form.AppField
                  name="currentPassword"
                  children={(field) => {
                    return (
                      <field.TextField
                        label={m.auth_current_password()}
                        required
                        type="password"
                        autoComplete="current-password"
                        placeholder="******"
                        name="current-password"
                      />
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

type DeleteAccountDialogProps = WithDialog<{ user: User }>

export const DeleteAccountDialog = ({
  open,
  onOpenChange
}: DeleteAccountDialogProps) => {
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
              onOpenChange(false)
            }}
          />
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}

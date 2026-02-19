import React from 'react'
import type { User } from 'better-auth'
import { CircleAlert, MessageCircleWarning } from 'lucide-react'
import { toast } from 'sonner'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import { getAuthErrorMessage } from '@/helpers/auth-errors'
import { authClient } from '@/lib/auth-client'
import { deleteMixpanelUser } from '@/lib/mixpanel'
import {
  getActiveSubscriptionQueryOpts,
  getAuthUserQueryOpts,
  getFavoritesMemesQueryOpts
} from '@/lib/queries'
import { getFieldErrorMessage } from '@/lib/utils'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

const deleteAccountDialog = z.object({
  currentPassword: z.string().nonempty()
})

const deleteAccountFormOpts = formOptions({
  defaultValues: {
    currentPassword: ''
  },
  validators: {
    onChange: deleteAccountDialog
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
        throw new Error(error.code)
      }
    },
    onSuccess: async () => {
      queryClient.removeQueries(getAuthUserQueryOpts())
      queryClient.removeQueries(getActiveSubscriptionQueryOpts())
      queryClient.removeQueries(getFavoritesMemesQueryOpts())
      deleteMixpanelUser()
      toast.success('Votre compte a bien été supprimé !')
      void router.navigate({ to: '/', from: '/' })
      await router.invalidate()
    }
  })

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
                    Êtes-vous sûr de vouloir supprimer votre compte ? Cette
                    action est irréversible : toutes vos données (comme vos
                    favoris) seront définitivement effacés, sans possibilité de
                    récupération.
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
                  Je confirme la suppression
                </LoadingButton>
                <Button
                  variant="default"
                  type="button"
                  className="w-full"
                  onClick={() => {
                    onCancel()
                  }}
                >
                  Annuler
                </Button>
                {deleteAccountMutation.error ? (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertDescription>
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
                        <FormLabel>Votre mot de passe</FormLabel>
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
                  Supprimer
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
          <DialogTitle>Supprimer mon compte</DialogTitle>
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

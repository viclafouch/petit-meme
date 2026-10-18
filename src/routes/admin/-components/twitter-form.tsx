import { toast } from 'sonner'
import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { getErrorMessage } from '~/helpers/error'
import { useAppForm } from '~/hooks/use-app-form'
import { focusFirstInvalidField } from '~/lib/form'
import { createMemeFromTwitterUrl } from '~/routes/admin/-server/memes'

const formSchema = z.object({ url: TWEET_LINK_SCHEMA })

const formOpts = formOptions({
  defaultValues: {
    url: ''
  },
  validators: {
    onChange: formSchema
  }
})

type TwitterFormProps = {
  closeDialog: () => void
  onSuccess?: ({ memeId }: { memeId: string }) => void
}

export const TwitterForm = ({ onSuccess, closeDialog }: TwitterFormProps) => {
  const form = useAppForm({
    ...formOpts,
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: async ({ value }) => {
      if (createMemeFromTwitterUrlMutation.isPending) {
        return
      }

      await createMemeFromTwitterUrlMutation.mutateAsync({
        url: value.url
      })
    }
  })

  const createMemeFromTwitterUrlMutation = useMutation({
    mutationKey: ['createMemeFromTwitterUrl'],
    mutationFn: (body: { url: string }) => {
      const promise = createMemeFromTwitterUrl({ data: body.url })
      toast.promise(promise, {
        loading: 'Ajout en cours...',
        success: () => {
          return 'Mème créé avec succès !'
        },
        error: getErrorMessage
      })

      return promise
    },
    onSuccess: (data) => {
      closeDialog()
      onSuccess?.({ memeId: data.id })
    }
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid gap-3">
        <form.AppField
          name="url"
          children={(field) => {
            return (
              <field.ClipboardPasteField
                label="Tweet URL"
                required
                type="text"
                name="twitter-link"
              />
            )
          }}
        />
      </div>
      <form.AppForm>
        <form.FormFooter onCancel={closeDialog} submitLabel="Ajouter" />
      </form.AppForm>
    </form>
  )
}

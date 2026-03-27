import { toast } from 'sonner'
import { z } from 'zod'
import { ClipboardPasteInput } from '~/components/clipboard-paste-input'
import { FormFooter } from '~/components/form-footer'
import { FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { getErrorMessage } from '~/helpers/error'
import { getFieldErrorMessage } from '~/lib/utils'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'

import { createMemeFromTwitterUrl } from '~admin/-server/memes'

const formSchema = z.object({ url: TWEET_LINK_SCHEMA })

const formOpts = formOptions({
  defaultValues: {
    url: ''
  },
  validators: {
    onChange: formSchema
  }
})

type TwitterFormParams = {
  onSuccess?: ({ memeId }: { memeId: string }) => void
  closeDialog: () => void
}

export const TwitterForm = ({ onSuccess, closeDialog }: TwitterFormParams) => {
  const form = useForm({
    ...formOpts,
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
        <form.Field
          name="url"
          children={(field) => {
            const errorMessage = getFieldErrorMessage({ field })

            return (
              <FormItem error={errorMessage}>
                <FormLabel>Tweet URL</FormLabel>
                <ClipboardPasteInput
                  required
                  type="text"
                  name="twitter-link"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    return field.handleChange(event.target.value)
                  }}
                  onClipboardPaste={(text) => {
                    return field.handleChange(text)
                  }}
                />
                <FormMessage />
              </FormItem>
            )
          }}
        />
      </div>
      <form.Subscribe
        selector={(state) => {
          return [state.canSubmit, state.isSubmitting]
        }}
        children={([canSubmit = false, isSubmitting = false]) => {
          return (
            <FormFooter
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              onCancel={closeDialog}
              submitLabel="Ajouter"
            />
          )
        }}
      />
    </form>
  )
}

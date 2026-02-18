import { ClipboardPaste } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormFooter } from '@/components/admin/form-footer'
import { IconButtonStars } from '@/components/animate-ui/buttons/icon-button-stars'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TWEET_LINK_SCHEMA } from '@/constants/meme'
import { getFieldErrorMessage } from '@/lib/utils'
import { createMemeFromTwitterUrl } from '@/server/admin'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'

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

  const clipboardMutation = useMutation({
    mutationFn: () => {
      return navigator.clipboard.readText()
    },
    onSuccess: (text) => {
      form.setFieldValue('url', text.trim())
    }
  })

  const handlePasteFromClipboard = () => {
    void clipboardMutation.mutateAsync().finally(() => {
      setTimeout(() => {
        clipboardMutation.reset()
      }, 3000)
    })
  }

  const createMemeFromTwitterUrlMutation = useMutation({
    mutationKey: ['createMemeFromTwitterUrl'],
    mutationFn: (body: { url: string }) => {
      const promise = createMemeFromTwitterUrl({ data: body.url })
      toast.promise(promise, {
        loading: 'Ajout en cours...',
        success: () => {
          return 'Mème créé avec succès !'
        }
      })
      closeDialog()

      return promise
    },
    onSuccess: (data) => {
      onSuccess?.({ memeId: data.id })
    },
    onError: (error) => {
      toast.error(error.message)
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
                <div className="relative w-full">
                  <FormControl>
                    <Input
                      required
                      type="text"
                      className="pr-9"
                      name="twitter-link"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        return field.handleChange(event.target.value)
                      }}
                    />
                  </FormControl>
                  <IconButtonStars
                    active={
                      clipboardMutation.isPending || clipboardMutation.isSuccess
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
                    onClick={handlePasteFromClipboard}
                    type="button"
                    onlyStars
                  >
                    <ClipboardPaste />
                  </IconButtonStars>
                </div>
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

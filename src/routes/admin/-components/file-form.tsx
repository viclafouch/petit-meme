import React from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { FormFooter } from '~/components/form-footer'
import { Button } from '~/components/ui/button'
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger
} from '~/components/ui/file-upload'
import { FormItem, FormMessage } from '~/components/ui/form'
import { getErrorMessage } from '~/helpers/error'
import { getFieldErrorMessage } from '~/lib/utils'
import {
  CREATE_MEME_FROM_FILE_SCHEMA,
  createMemeFromFile
} from '~/routes/admin/-server/memes'

const FILE_NAME_PREVIEW_LENGTH = 20

type FileFormProps = {
  closeDialog: () => void
  onSuccess?: ({ memeId }: { memeId: string }) => void
}

type FileFormValues = {
  video: File | undefined
}

const DEFAULT_VALUES: FileFormValues = {
  video: undefined
}

const formOpts = formOptions({
  defaultValues: DEFAULT_VALUES,
  validators: {
    onChange: CREATE_MEME_FROM_FILE_SCHEMA
  }
})

export const FileForm = ({ onSuccess, closeDialog }: FileFormProps) => {
  const form = useForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      if (createMemeFromFileMutation.isPending) {
        return
      }

      await createMemeFromFileMutation.mutateAsync(
        CREATE_MEME_FROM_FILE_SCHEMA.parse(value)
      )
    }
  })

  const createMemeFromFileMutation = useMutation({
    mutationKey: ['createMemeFromFile'],
    mutationFn: (body: z.infer<typeof CREATE_MEME_FROM_FILE_SCHEMA>) => {
      const formData = new FormData()
      formData.append('video', body.video)

      const promise = createMemeFromFile({ data: formData })
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

  const onFileReject = React.useCallback((file: File, message: string) => {
    toast(message, {
      description: `"${file.name.length > FILE_NAME_PREVIEW_LENGTH ? `${file.name.slice(0, FILE_NAME_PREVIEW_LENGTH)}...` : file.name}" has been rejected`
    })
  }, [])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <form.Field
        name="video"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage} className="w-full">
              <FileUpload
                value={
                  field.state.value === undefined ? [] : [field.state.value]
                }
                onValueChange={(files) => {
                  field.handleChange(files[0])
                }}
                onFileReject={onFileReject}
                accept="video/*"
                maxFiles={1}
                className="w-full"
              >
                <FileUploadDropzone>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center rounded-full border p-2.5">
                      <Upload className="size-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm">
                      Glisser-déposer ton fichier ici
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Ou cliquez pour parcourir (1 fichier maximum)
                    </p>
                  </div>
                  <FileUploadTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2 w-fit">
                      Parcourir les fichiers
                    </Button>
                  </FileUploadTrigger>
                </FileUploadDropzone>
                <FileUploadList>
                  {field.state.value === undefined ? null : (
                    <FileUploadItem value={field.state.value}>
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          aria-label="Supprimer le fichier"
                        >
                          <X />
                        </Button>
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  )}
                </FileUploadList>
              </FileUpload>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.Subscribe
        selector={(state) => {
          return [state.canSubmit, state.isSubmitting] as const
        }}
        children={([canSubmit, isSubmitting]) => {
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

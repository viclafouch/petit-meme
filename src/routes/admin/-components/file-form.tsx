import { FileVideo, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Field, FieldDescription, FieldError } from '~/components/ui/field'
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
import { MEME_FILE_IMPORT_SCHEMA } from '~/constants/meme-form'
import { useAppForm } from '~/hooks/use-app-form'
import { focusFirstInvalidField, matchIsFieldInvalid } from '~/lib/form'
import { captureWithFeature } from '~/lib/sentry'
import { ImportFormFooter } from '~/routes/admin/-components/import-form-footer'
import { createMemeFromFile } from '~/server/admin/import/import.functions'

type FileFormProps = {
  onImported: (memeId: string) => Promise<void>
}

type FileFormValues = {
  video: File | undefined
}

const DEFAULT_VALUES: FileFormValues = {
  video: undefined
}

const ignoreReportedError = () => {}

const handleFileReject = (file: File, message: string) => {
  toast.error(message, { description: file.name })
}

export const FileForm = ({ onImported }: FileFormProps) => {
  const importMutation = useMutation({
    mutationKey: ['import-meme-from-file'],
    mutationFn: (video: File) => {
      const formData = new FormData()
      formData.append('video', video)

      return createMemeFromFile({ data: formData })
    },
    onSuccess: ({ id }) => {
      return onImported(id)
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-import')
    }
  })

  const form = useAppForm({
    defaultValues: DEFAULT_VALUES,
    validators: { onChange: MEME_FILE_IMPORT_SCHEMA },
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: async ({ value }) => {
      const { video } = MEME_FILE_IMPORT_SCHEMA.parse(value)
      await importMutation.mutateAsync(video).catch(ignoreReportedError)
    }
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="video"
        children={(field) => {
          const isInvalid = matchIsFieldInvalid(field.state.meta)

          return (
            <Field data-invalid={isInvalid}>
              <FileUpload
                value={
                  field.state.value === undefined ? [] : [field.state.value]
                }
                accept="video/mp4"
                maxFiles={1}
                invalid={isInvalid}
                className="w-full"
                onValueChange={(files) => {
                  field.handleChange(files[0])
                }}
                onFileReject={handleFileReject}
              >
                <FileUploadDropzone aria-invalid={isInvalid}>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex items-center justify-center rounded-full border p-2.5">
                      <FileVideo
                        className="size-6 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                    <p className="text-sm font-medium">
                      Glisser une vidéo MP4 ici
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Un seul fichier
                    </p>
                  </div>
                  <FileUploadTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 w-fit"
                      />
                    }
                  >
                    Choisir un fichier
                  </FileUploadTrigger>
                </FileUploadDropzone>
                <FileUploadList>
                  {field.state.value === undefined ? null : (
                    <FileUploadItem value={field.state.value}>
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete
                        aria-label="Retirer le fichier"
                        render={
                          <Button type="button" variant="ghost" size="icon" />
                        }
                      >
                        <X aria-hidden />
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  )}
                </FileUploadList>
              </FileUpload>
              <FieldDescription>
                La vidéo part sur Bunny, puis la page du Meme s&apos;ouvre.
              </FieldDescription>
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          )
        }}
      />
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitting
        }}
        children={(isSubmitting) => {
          return (
            <ImportFormFooter
              error={importMutation.error}
              isSubmitting={isSubmitting}
            />
          )
        }}
      />
    </form>
  )
}

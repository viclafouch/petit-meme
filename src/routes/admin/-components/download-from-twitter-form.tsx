import { toast } from 'sonner'
import { z } from 'zod'
import { ClipboardPasteInput } from '~/components/clipboard-paste-input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import { FormItem, FormLabel, FormMessage } from '~/components/ui/form'
import { LoadingButton } from '~/components/ui/loading-button'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { base64ToBlob } from '~/helpers/blob'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import { getFieldErrorMessage } from '~/lib/utils'
import { fetchTweetVideo, getTweetFromUrl } from '~/server/twitter'
import { downloadBlob } from '~/utils/download'
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

export const DownloadFromTwitterForm = () => {
  const form = useForm({
    ...formOpts,
    onSubmit: async ({ value }) => {
      if (downloadFileFromTweet.isPending) {
        return
      }

      await downloadFileFromTweet.mutateAsync({
        url: value.url
      })
    }
  })

  const downloadFileFromTweet = useMutation({
    mutationKey: ['download-file-from-tweet'],
    mutationFn: async (body: { url: string }) => {
      const tweet = await getTweetFromUrl({ data: body.url })
      const videoBase64 = await fetchTweetVideo({
        data: { videoUrl: tweet.video.url }
      })
      const videoBlob = base64ToBlob(videoBase64, 'video/mp4')
      downloadBlob(videoBlob, `${tweet.id}.mp4`)
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-downloader')
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      noValidate
    >
      <Card className="md:max-w-lg">
        <CardHeader>
          <CardTitle>Télécharger une vidéo depuis un tweet</CardTitle>
          <CardDescription>
            Ajouter un mème à la bibliothèque depuis un tweet.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
        <CardFooter>
          <form.Subscribe
            selector={(state) => {
              return [state.canSubmit, state.isSubmitting]
            }}
            children={([canSubmit, isSubmitting = false]) => {
              return (
                <LoadingButton isLoading={isSubmitting} disabled={!canSubmit}>
                  Extraire et télécharger
                </LoadingButton>
              )
            }}
          />
        </CardFooter>
      </Card>
    </form>
  )
}

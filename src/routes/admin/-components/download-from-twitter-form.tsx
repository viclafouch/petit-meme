import { toast } from 'sonner'
import { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import { LoadingButton } from '~/components/ui/loading-button'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { base64ToBlob } from '~/helpers/blob'
import { getErrorMessage } from '~/helpers/error'
import { useAppForm } from '~/hooks/use-app-form'
import { focusFirstInvalidField } from '~/lib/form'
import { captureWithFeature } from '~/lib/sentry'
import { fetchTweetVideo, getTweetFromUrl } from '~/server/twitter'
import { downloadBlob } from '~/utils/download'

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
  const form = useAppForm({
    ...formOpts,
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: async ({ value }) => {
      if (downloadFileFromTweetMutation.isPending) {
        return
      }

      await downloadFileFromTweetMutation.mutateAsync({
        url: value.url
      })
    }
  })

  const downloadFileFromTweetMutation = useMutation({
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
        </CardContent>
        <CardFooter>
          <form.Subscribe
            selector={(state) => {
              return [state.canSubmit, state.isSubmitting] as const
            }}
            children={([canSubmit, isSubmitting]) => {
              return (
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!canSubmit}
                >
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

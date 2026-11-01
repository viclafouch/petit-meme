import { ClipboardPaste } from 'lucide-react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '~/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '~/components/ui/input-group'
import { TWEET_LINK_SCHEMA } from '~/constants/url'
import { useAppForm } from '~/hooks/use-app-form'
import { useClipboardPaste } from '~/hooks/use-clipboard-paste'
import { focusFirstInvalidField, matchIsFieldInvalid } from '~/lib/form'
import { captureWithFeature } from '~/lib/sentry'
import { ImportFormFooter } from '~/routes/admin/-components/import-form-footer'
import { createMemeFromTwitterUrl } from '~/routes/admin/-server/memes'

const ignoreReportedError = () => {}

const TWEET_FORM_SCHEMA = z.object({ url: TWEET_LINK_SCHEMA })

type TwitterFormProps = {
  onImported: (memeId: string) => Promise<void>
}

export const TwitterForm = ({ onImported }: TwitterFormProps) => {
  const importMutation = useMutation({
    mutationKey: ['import-meme-from-tweet'],
    mutationFn: (url: string) => {
      return createMemeFromTwitterUrl({ data: url })
    },
    onSuccess: ({ id }) => {
      return onImported(id)
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-import')
    }
  })

  const form = useAppForm({
    defaultValues: { url: '' },
    validators: { onChange: TWEET_FORM_SCHEMA },
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: async ({ value }) => {
      await importMutation.mutateAsync(value.url).catch(ignoreReportedError)
    }
  })

  const clipboard = useClipboardPaste({
    onPaste: (text) => {
      form.setFieldValue('url', text)
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
        name="url"
        children={(field) => {
          const isInvalid = matchIsFieldInvalid(field.state.meta)

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor="import-tweet-url">Lien du tweet</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="import-tweet-url"
                  name={field.name}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://x.com/compte/status/..."
                  aria-invalid={isInvalid}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    aria-label="Coller depuis le presse-papiers"
                    onClick={clipboard.handlePaste}
                  >
                    <ClipboardPaste aria-hidden />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                La vidéo du tweet part sur Bunny, puis la page du Meme
                s&apos;ouvre.
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

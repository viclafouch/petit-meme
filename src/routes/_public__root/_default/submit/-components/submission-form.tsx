import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription } from '~/components/ui/alert'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { LoadingButton } from '~/components/ui/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { getStudioErrorCode, type StudioErrorCode } from '~/constants/error'
import {
  CREATE_MEME_SUBMISSION_SCHEMA,
  MAX_PENDING_SUBMISSIONS
} from '~/constants/meme-submission'
import { MemeContentLocale } from '~/db/generated/prisma/enums'
import { getErrorMessage, matchIsRateLimitError } from '~/helpers/error'
import {
  getContentLocaleOptions,
  matchIsMemeContentLocale
} from '~/helpers/i18n-content'
import { useAppForm } from '~/hooks/use-app-form'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { focusFirstInvalidField, getFieldErrorMessage } from '~/lib/form'
import { getUserSubmissionsQueryOpts } from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'
import { createMemeSubmission } from '~/server/meme-submission'

type SubmissionFormValues = {
  title: string
  url: string
  contentLocale: MemeContentLocale
  acceptTerms: boolean
}

const SUBMISSION_FORM_DEFAULT_VALUES: SubmissionFormValues = {
  title: '',
  url: '',
  contentLocale: MemeContentLocale.FR,
  acceptTerms: false
}

const submissionFormOpts = formOptions({
  defaultValues: SUBMISSION_FORM_DEFAULT_VALUES,
  validators: {
    onSubmit: CREATE_MEME_SUBMISSION_SCHEMA
  }
})

const SUBMISSION_ERROR_MESSAGES: Partial<
  Record<StudioErrorCode, () => string>
> = {
  SUBMISSION_LIMIT_REACHED: () => {
    return m.submit_error_limit_reached()
  },
  DUPLICATE_URL: () => {
    return m.submit_error_duplicate_url()
  },
  TWEET_NO_VIDEO: () => {
    return m.submit_error_tweet_no_video()
  },
  TWEET_VERIFICATION_FAILED: () => {
    return m.submit_error_tweet_verification_failed()
  }
}

const getSubmissionErrorMessage = (error: Error) => {
  const code = getStudioErrorCode(error)
  const mapper =
    code === undefined ? undefined : SUBMISSION_ERROR_MESSAGES[code]

  if (mapper) {
    return mapper()
  }

  if (matchIsRateLimitError(error)) {
    return m.submit_error_rate_limit()
  }

  return getErrorMessage(error)
}

type SubmissionFormProps = {
  pendingCount: number
}

export const SubmissionForm = ({ pendingCount }: SubmissionFormProps) => {
  const queryClient = useQueryClient()
  const remaining = MAX_PENDING_SUBMISSIONS - pendingCount

  const submitMutation = useMutation({
    mutationFn: async (data: z.input<typeof CREATE_MEME_SUBMISSION_SCHEMA>) => {
      return createMemeSubmission({ data })
    },
    onError: (error) => {
      captureWithFeature(error, 'meme-submission')
    },
    onSuccess: () => {
      toast.success(m.submit_success_toast())
      form.reset()

      return queryClient.invalidateQueries({
        queryKey: getUserSubmissionsQueryOpts.all
      })
    }
  })

  const form = useAppForm({
    ...submissionFormOpts,
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: async ({ value }) => {
      return submitMutation.mutateAsync({
        title: value.title,
        url: value.url,
        contentLocale: value.contentLocale,
        acceptTerms: true
      })
    }
  })

  const errorRef = useErrorFocus(submitMutation.error)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <form.AppField
        name="title"
        children={(field) => {
          return (
            <field.TextField
              label={m.submit_field_title()}
              required
              type="text"
              placeholder={m.submit_field_title_placeholder()}
              maxLength={100}
            />
          )
        }}
      />
      <form.AppField
        name="url"
        children={(field) => {
          return (
            <field.ClipboardPasteField
              label={m.submit_field_link()}
              required
              type="url"
              placeholder={m.submit_field_link_placeholder()}
            />
          )
        }}
      />
      <form.Field
        name="contentLocale"
        children={(field) => {
          return (
            <FormItem error={getFieldErrorMessage(field.state.meta)}>
              <FormLabel>{m.submit_field_language()}</FormLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => {
                  if (matchIsMemeContentLocale(value)) {
                    field.handleChange(value)
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getContentLocaleOptions().map((option) => {
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <form.AppField
        name="acceptTerms"
        children={(field) => {
          return (
            <field.CheckboxField
              label={
                <>
                  {m.submit_accept_terms_prefix()}
                  <Link
                    to="/terms-of-use"
                    className="text-info underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.submit_terms_link_text()}
                  </Link>
                  {m.submit_accept_terms_and()}
                  <Link
                    to="/privacy"
                    className="text-info underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.submit_privacy_link_text()}
                  </Link>
                </>
              }
            />
          )
        }}
      />
      <p className="text-sm text-muted-foreground">
        {m.submit_pending_count({ remaining })}
      </p>
      <form.Subscribe
        selector={(state) => {
          return state.isSubmitting
        }}
        children={(isSubmitting) => {
          return (
            <LoadingButton
              isLoading={isSubmitting}
              type="submit"
              className="w-full"
            >
              {m.submit_submit_button()}
            </LoadingButton>
          )
        }}
      />
      {submitMutation.error ? (
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-destructive-foreground">
            {getSubmissionErrorMessage(submitMutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

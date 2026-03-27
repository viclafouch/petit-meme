import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { formOptions, useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ClipboardPasteInput } from '~/components/clipboard-paste-input'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Checkbox } from '~/components/ui/checkbox'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { LoadingButton } from '~/components/ui/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { getStudioErrorCode } from '~/constants/error'
import type { StudioErrorCode } from '~/constants/error'
import {
  CREATE_MEME_SUBMISSION_SCHEMA,
  MAX_PENDING_SUBMISSIONS
} from '~/constants/meme-submission'
import { MemeContentLocale } from '~/db/generated/prisma/enums'
import { getErrorMessage, matchIsRateLimitError } from '~/helpers/error'
import { getContentLocaleOptions } from '~/helpers/i18n-content'
import { useErrorFocus } from '~/hooks/use-error-focus'
import { getUserSubmissionsQueryOpts } from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { getFieldErrorMessage } from '~/lib/utils'
import { m } from '~/paraglide/messages'
import { createMemeSubmission } from '~/server/meme-submission'

const SUBMISSION_FIELD_ERRORS: Record<string, () => string> = {
  titleTooShort: () => {
    return m.submit_error_title_too_short()
  },
  invalidUrl: () => {
    return m.submit_error_invalid_url()
  },
  invalidSubmissionUrl: () => {
    return m.submit_url_error()
  },
  acceptTermsRequired: () => {
    return m.validation_accept_terms()
  }
}

const getDisplayError = (errorMessage: string) => {
  const mapper = SUBMISSION_FIELD_ERRORS[errorMessage]

  return mapper ? mapper() : errorMessage
}

const submissionFormOpts = formOptions({
  defaultValues: {
    title: '',
    url: '',
    contentLocale: MemeContentLocale.FR as MemeContentLocale,
    acceptTerms: false as boolean
  },
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
  const mapper = code ? SUBMISSION_ERROR_MESSAGES[code] : undefined

  if (mapper) {
    return mapper()
  }

  if (matchIsRateLimitError(error)) {
    return m.submit_error_rate_limit()
  }

  return getErrorMessage(error)
}

type SubmissionFormParams = {
  pendingCount: number
}

export const SubmissionForm = ({ pendingCount }: SubmissionFormParams) => {
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
      void queryClient.invalidateQueries({
        queryKey: getUserSubmissionsQueryOpts.all
      })
      form.reset()
    }
  })

  const form = useForm({
    ...submissionFormOpts,
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
      <form.Field
        name="title"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={getDisplayError(errorMessage)}>
              <FormLabel>{m.submit_field_title()}</FormLabel>
              <FormControl>
                <Input
                  required
                  type="text"
                  placeholder={m.submit_field_title_placeholder()}
                  name="title"
                  maxLength={100}
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
      <form.Field
        name="url"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={getDisplayError(errorMessage)}>
              <FormLabel>{m.submit_field_link()}</FormLabel>
              <ClipboardPasteInput
                required
                type="url"
                placeholder={m.submit_field_link_placeholder()}
                name="url"
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
      <form.Field
        name="contentLocale"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={errorMessage}>
              <FormLabel>{m.submit_field_language()}</FormLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => {
                  return field.handleChange(value as MemeContentLocale)
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
      <form.Field
        name="acceptTerms"
        children={(field) => {
          const errorMessage = getFieldErrorMessage({ field })

          return (
            <FormItem error={getDisplayError(errorMessage)} className="w-full">
              <div className="flex items-start gap-2">
                <FormControl>
                  <Checkbox
                    id="acceptTermsSubmit"
                    checked={field.state.value === true}
                    onCheckedChange={(checked) => {
                      return field.handleChange(checked === true)
                    }}
                    onBlur={field.handleBlur}
                  />
                </FormControl>
                <label
                  htmlFor="acceptTermsSubmit"
                  className="text-xs text-muted-foreground leading-snug"
                >
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
                </label>
              </div>
              <FormMessage />
            </FormItem>
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

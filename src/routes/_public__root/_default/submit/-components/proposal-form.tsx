import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { formOptions } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAppForm } from '~/components/form/use-app-form'
import { useErrorFocus } from '~/components/form/use-error-focus'
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
import {
  MEME_PROPOSAL_SCHEMA,
  MAX_PENDING_PROPOSALS
} from '~/constants/meme-proposal'
import { MemeContentLocale } from '~/db/generated/prisma/enums'
import { getErrorMessage, matchIsRateLimitError } from '~/helpers/error'
import { getContentLocaleOptions } from '~/helpers/i18n-content'
import { focusFirstInvalidField, getFieldErrorMessage } from '~/lib/form'
import { captureWithFeature } from '~/lib/sentry'
import { m } from '~/paraglide/messages'
import { listUserProposalsQueryOpts } from '~/queries/proposal'
import { createProposal } from '~/server/proposal/proposal.functions'

type ProposalFormValues = {
  title: string
  url: string
  contentLocale: MemeContentLocale
  acceptTerms: boolean
}

const PROPOSAL_FORM_DEFAULT_VALUES: ProposalFormValues = {
  title: '',
  url: '',
  contentLocale: MemeContentLocale.FR,
  acceptTerms: false
}

const proposalFormOpts = formOptions({
  defaultValues: PROPOSAL_FORM_DEFAULT_VALUES,
  validators: {
    onSubmit: MEME_PROPOSAL_SCHEMA
  }
})

const getProposalErrorMessage = (error: Error) => {
  if (matchIsRateLimitError(error)) {
    return m.submit_error_rate_limit()
  }

  return getErrorMessage(error)
}

type ProposalFormProps = {
  pendingCount: number
}

export const ProposalForm = ({ pendingCount }: ProposalFormProps) => {
  const contentLocaleOptions = getContentLocaleOptions()
  const queryClient = useQueryClient()
  const remaining = MAX_PENDING_PROPOSALS - pendingCount

  const submitMutation = useMutation({
    mutationFn: async (data: z.input<typeof MEME_PROPOSAL_SCHEMA>) => {
      return createProposal({ data })
    },
    onError: (error) => {
      captureWithFeature(error, 'meme-submission')
    },
    onSuccess: () => {
      toast.success(m.submit_success_toast())
      form.reset()

      return queryClient.invalidateQueries({
        queryKey: listUserProposalsQueryOpts.all
      })
    }
  })

  const form = useAppForm({
    ...proposalFormOpts,
    onSubmitInvalid: focusFirstInvalidField,
    onSubmit: ({ value }) => {
      submitMutation.mutate({
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
                items={contentLocaleOptions}
                value={field.state.value}
                onValueChange={(value) => {
                  if (value !== null) {
                    field.handleChange(value)
                  }
                }}
              >
                <FormControl render={<SelectTrigger />}>
                  <SelectValue />
                </FormControl>
                <SelectContent>
                  {contentLocaleOptions.map((option) => {
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
      <LoadingButton
        isLoading={submitMutation.isPending}
        type="submit"
        className="w-full"
      >
        {m.submit_submit_button()}
      </LoadingButton>
      {submitMutation.error ? (
        <Alert ref={errorRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-destructive-foreground">
            {getProposalErrorMessage(submitMutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

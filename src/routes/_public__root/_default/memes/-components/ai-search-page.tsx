import React from 'react'
import { SparklesIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type Mutation
} from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useAppForm } from '~/components/form/use-app-form'
import { MemesList } from '~/components/meme/memes-list'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Textarea } from '~/components/ui/textarea'
import {
  AI_SEARCH_PROMPT_STORAGE_KEY,
  MAX_PROMPT_LENGTH
} from '~/constants/ai-search'
import { getAppErrorCode } from '~/constants/error'
import { EASE_OUT } from '~/constants/motion'
import { buildReachedCapState } from '~/helpers/cap'
import { getErrorMessage } from '~/helpers/error'
import { snoozePremiumReminder } from '~/lib/premium-reminder'
import { captureWithFeature } from '~/lib/sentry'
import { buildBreadcrumbJsonLd } from '~/lib/seo/json-ld'
import { m } from '~/paraglide/messages'
import { getAiSearchQuotaQueryOpts } from '~/queries/ai-search'
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { AiSearchStages } from '~/routes/_public__root/_default/memes/-components/ai-search-stages'
import { useAiSearchStages } from '~/routes/_public__root/_default/memes/-components/use-ai-search-stages'
import { searchMemesWithAi } from '~/server/ai-search/ai-search.functions'
import { useDialogStore } from '~/stores/dialog.store'

type AiSearchResult = Awaited<ReturnType<typeof searchMemesWithAi>>

type AiSearchVariables = { prompt: string }

const AI_SEARCH_MUTATION_KEY = ['ai-search'] as const

export const AiSearchPage = () => {
  const dialogStore = useDialogStore()
  const { user } = useRouteContext({ from: '__root__' })
  const queryClient = useQueryClient()

  const quotaQuery = useQuery({
    ...getAiSearchQuotaQueryOpts(),
    enabled: Boolean(user)
  })

  const searchMutation = useMutation({
    mutationKey: AI_SEARCH_MUTATION_KEY,
    mutationFn: (data: AiSearchVariables) => {
      return searchMemesWithAi({ data })
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        getAiSearchQuotaQueryOpts().queryKey,
        result.quota
      )
    },
    onError: (error) => {
      searchStagesResetRef.current()

      const errorCode = getAppErrorCode(error)

      if (errorCode === 'AI_SEARCH_QUOTA_EXCEEDED') {
        queryClient.setQueryData(
          getAiSearchQuotaQueryOpts().queryKey,
          buildReachedCapState('aiSearch')
        )
        snoozePremiumReminder()
        dialogStore.actions.showDialog('ai-search-upsell')

        return
      }

      if (errorCode === 'UNAUTHORIZED') {
        dialogStore.actions.showDialog('auth')

        return
      }

      if (errorCode === 'RATE_LIMITED') {
        toast.error(m.ai_search_error_rate_limit())

        return
      }

      if (errorCode !== undefined) {
        toast.error(getErrorMessage(error))

        return
      }

      captureWithFeature(error, 'ai-search')
      toast.error(m.ai_search_error_generic())
    }
  })

  const latestSearch = useMutationState({
    filters: { mutationKey: AI_SEARCH_MUTATION_KEY, status: 'success' },
    select: (mutation: Mutation<AiSearchResult, Error, AiSearchVariables>) => {
      return mutation.state
    }
  }).at(-1)

  const searchStages = useAiSearchStages(searchMutation.isPending)
  const searchStagesResetRef = React.useRef(searchStages.reset)
  React.useEffect(() => {
    searchStagesResetRef.current = searchStages.reset
  }, [searchStages.reset])

  const form = useAppForm({
    defaultValues: { prompt: latestSearch?.variables?.prompt ?? '' },
    onSubmit: ({ value }) => {
      const trimmed = value.prompt.trim()

      if (trimmed.length === 0) {
        return
      }

      if (!user) {
        sessionStorage.setItem(AI_SEARCH_PROMPT_STORAGE_KEY, trimmed)
        dialogStore.actions.showDialog('auth')

        return
      }

      if (quotaQuery.data?.isReached) {
        snoozePremiumReminder()
        dialogStore.actions.showDialog('ai-search-upsell')

        return
      }

      searchMutation.mutate({ prompt: trimmed })
    }
  })

  React.useEffect(() => {
    const handedOverPrompt = sessionStorage.getItem(
      AI_SEARCH_PROMPT_STORAGE_KEY
    )

    if (handedOverPrompt) {
      sessionStorage.removeItem(AI_SEARCH_PROMPT_STORAGE_KEY)
      form.setFieldValue('prompt', handedOverPrompt)
    }
  }, [form])

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: m.meme_breadcrumb_home(), pathname: '/' },
    { name: m.ai_search_seo_title(), pathname: '/memes/ai-search' }
  ])

  return (
    <PageContainer as="main">
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </script>
      <PageHeader>
        <PageHeading>{m.ai_search_title()}</PageHeading>
        <PageDescription>{m.ai_search_description()}</PageDescription>
      </PageHeader>
      <section className="flex flex-col gap-y-8">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
          className="mx-auto flex w-full max-w-2xl flex-col gap-y-2"
        >
          <form.Field
            name="prompt"
            children={(field) => {
              return (
                <div className="relative">
                  <Textarea
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    onBlur={field.handleBlur}
                    placeholder={m.ai_search_placeholder()}
                    maxLength={MAX_PROMPT_LENGTH}
                    className="min-h-28 resize-none text-base"
                    aria-label={m.ai_search_title()}
                  />
                  <span
                    className="text-muted-foreground pointer-events-none absolute right-3 bottom-3 text-xs"
                    aria-hidden="true"
                  >
                    {field.state.value.length}/{MAX_PROMPT_LENGTH}
                  </span>
                </div>
              )
            }}
          />
          <div className="flex items-start justify-between">
            <div>
              {quotaQuery.data && !quotaQuery.data.isPremium ? (
                <RemainingSearches
                  remainingSearches={quotaQuery.data.remaining}
                />
              ) : null}
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={
                searchStages.isActive || (Boolean(user) && quotaQuery.isPending)
              }
              aria-busy={searchStages.isActive}
            >
              <SparklesIcon aria-hidden="true" />
              {m.ai_search_submit()}
            </Button>
          </div>
        </form>
        <section aria-live="polite" aria-label={m.ai_search_title()}>
          <AnimatePresence mode="wait">
            {searchStages.isActive ? (
              <AiSearchStages key="stages" stages={searchStages.stages} />
            ) : null}
            {!searchStages.isActive && latestSearch?.data ? (
              <AiSearchResultsAnimated
                key="results"
                result={latestSearch.data}
              />
            ) : null}
          </AnimatePresence>
        </section>
      </section>
    </PageContainer>
  )
}

type RemainingSearchesProps = {
  remainingSearches: number
}

const RemainingSearches = ({ remainingSearches }: RemainingSearchesProps) => {
  return (
    <output className="block text-muted-foreground text-sm">
      {m.ai_search_remaining_searches({ count: remainingSearches })}
    </output>
  )
}

type AiSearchResultsProps = {
  result: AiSearchResult
}

type AiSearchResultsAnimatedProps = AiSearchResultsProps

const AiSearchResultsAnimated = ({ result }: AiSearchResultsAnimatedProps) => {
  const isReducedMotion = useReducedMotion()
  const resultsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    resultsRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <motion.div
      ref={resultsRef}
      tabIndex={-1}
      className="outline-none"
      initial={isReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <AiSearchResults result={result} />
    </motion.div>
  )
}

const AiSearchResults = ({ result }: AiSearchResultsProps) => {
  if (result.memes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12">
        <p className="text-muted-foreground text-center text-sm">
          {m.ai_search_no_results()}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-8">
      <div className="flex flex-col gap-y-4">
        <Separator />
        <p className="text-muted-foreground text-sm">
          {m.ai_search_result_count({ count: result.memes.length })}
        </p>
      </div>
      <MemesList
        memes={result.memes}
        layoutContext="ai-search"
        queryID={result.queryID}
      />
    </div>
  )
}

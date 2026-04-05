import React from 'react'
import { SparklesIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { MemesList } from '~/components/Meme/memes-list'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Textarea } from '~/components/ui/textarea'
import {
  AI_SEARCH_PROMPT_STORAGE_KEY,
  MAX_PROMPT_LENGTH
} from '~/constants/ai-search'
import { getErrorMessage, matchIsRateLimitError } from '~/helpers/error'
import { useAiSearchStages } from '~/hooks/use-ai-search-stages'
import { getAiSearchQuotaQueryOpts } from '~/lib/queries'
import { captureWithFeature } from '~/lib/sentry'
import { buildBreadcrumbJsonLd } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { AiSearchStages } from '~/routes/_public__root/_default/memes/-components/ai-search-stages'
import { aiSearchMemes } from '~/server/ai-search'
import { useShowDialog } from '~/stores/dialog.store'

function getSearchErrorMessage(error: unknown) {
  if (matchIsRateLimitError(error)) {
    return m.ai_search_error_rate_limit()
  }

  return m.ai_search_error_generic()
}

type AiSearchResult = Awaited<ReturnType<typeof aiSearchMemes>>

export const AiSearchPage = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = React.useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    const saved = sessionStorage.getItem(AI_SEARCH_PROMPT_STORAGE_KEY)
    sessionStorage.removeItem(AI_SEARCH_PROMPT_STORAGE_KEY)

    return saved ?? ''
  })

  const quotaQuery = useQuery({
    ...getAiSearchQuotaQueryOpts(),
    enabled: Boolean(user)
  })

  const searchMutation = useMutation({
    mutationFn: (data: { prompt: string }) => {
      return aiSearchMemes({ data })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getAiSearchQuotaQueryOpts.all
      })
    },
    onError: (error) => {
      searchStagesResetRef.current()

      captureWithFeature(error, 'ai-search')
      toast.error(getSearchErrorMessage(error), {
        description: getErrorMessage(error)
      })
    }
  })

  const searchStages = useAiSearchStages(searchMutation.isPending)
  const searchStagesResetRef = React.useRef(searchStages.reset)
  searchStagesResetRef.current = searchStages.reset

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = prompt.trim()

    if (trimmed.length === 0) {
      return
    }

    if (!user) {
      sessionStorage.setItem(AI_SEARCH_PROMPT_STORAGE_KEY, trimmed)
      showDialog('auth', {})

      return
    }

    if (quotaQuery.data && !quotaQuery.data.canSearch) {
      showDialog('ai-search-upsell', {})

      return
    }

    searchMutation.mutate({ prompt: trimmed })
  }

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
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-2xl flex-col gap-y-2"
        >
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value)
              }}
              placeholder={m.ai_search_placeholder()}
              maxLength={MAX_PROMPT_LENGTH}
              className="min-h-28 resize-none text-base"
              aria-label={m.ai_search_title()}
            />
            <span
              className="text-muted-foreground pointer-events-none absolute right-3 bottom-3 text-xs"
              aria-hidden="true"
            >
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              {quotaQuery.data &&
              !quotaQuery.data.isPremium &&
              quotaQuery.data.remainingSearches !== null ? (
                <RemainingSearches
                  remainingSearches={quotaQuery.data.remainingSearches}
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
        <div aria-live="polite" role="region" aria-label={m.ai_search_title()}>
          <AnimatePresence mode="wait">
            {searchStages.isActive ? (
              <AiSearchStages key="stages" stages={searchStages.stages} />
            ) : null}
            {!searchStages.isActive &&
            searchMutation.data &&
            searchStages.isAllCompleted ? (
              <AiSearchResultsAnimated
                key="results"
                result={searchMutation.data}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </PageContainer>
  )
}

type RemainingSearchesProps = {
  remainingSearches: number
}

const RemainingSearches = ({ remainingSearches }: RemainingSearchesProps) => {
  return (
    <p className="text-muted-foreground text-sm">
      {m.ai_search_remaining_searches({
        count: Math.max(0, remainingSearches)
      })}
    </p>
  )
}

type AiSearchResultsProps = {
  result: AiSearchResult
}

const AiSearchResultsAnimated = ({ result }: AiSearchResultsProps) => {
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
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
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

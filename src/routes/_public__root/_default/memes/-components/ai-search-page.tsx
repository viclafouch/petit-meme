import React from 'react'
import { SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { MemesList } from '~/components/Meme/memes-list'
import { Badge } from '~/components/ui/badge'
import { LoadingButton } from '~/components/ui/loading-button'
import { Textarea } from '~/components/ui/textarea'
import { MAX_PROMPT_LENGTH } from '~/constants/ai-search'
import { getErrorMessage, matchIsRateLimitError } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import { buildBreadcrumbJsonLd } from '~/lib/seo'
import { m } from '~/paraglide/messages.js'
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import { aiSearchMemes } from '~/server/ai-search'
import { useShowDialog } from '~/stores/dialog.store'

const AI_SEARCH_PROMPT_STORAGE_KEY = 'ai-search-prompt'

function getSearchErrorMessage(error: unknown) {
  if (matchIsRateLimitError(error)) {
    return m.ai_search_error_rate_limit()
  }

  return m.ai_search_error_generic()
}

function matchIsQuotaExceeded(error: unknown) {
  return (
    error instanceof Error && error.message.includes('AI search quota exceeded')
  )
}

type AiSearchResult = Awaited<ReturnType<typeof aiSearchMemes>>

export const AiSearchPage = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()
  const [prompt, setPrompt] = React.useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    const saved = sessionStorage.getItem(AI_SEARCH_PROMPT_STORAGE_KEY)
    sessionStorage.removeItem(AI_SEARCH_PROMPT_STORAGE_KEY)

    return saved ?? ''
  })

  const searchMutation = useMutation({
    mutationFn: (data: { prompt: string }) => {
      return aiSearchMemes({ data })
    },
    onError: (error) => {
      if (matchIsQuotaExceeded(error)) {
        showDialog('ai-search-upsell', {})

        return
      }

      captureWithFeature(error, 'ai-search')
      toast.error(getSearchErrorMessage(error), {
        description: getErrorMessage(error)
      })
    }
  })

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
      <section className="container flex flex-col gap-8">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-2xl flex-col gap-4"
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
          <div className="flex justify-end">
            <LoadingButton
              type="submit"
              size="lg"
              isLoading={searchMutation.isPending}
              loadingText={m.ai_search_analyzing()}
            >
              <SparklesIcon aria-hidden="true" />
              {m.ai_search_submit()}
            </LoadingButton>
          </div>
        </form>
        <div aria-live="polite">
          {searchMutation.data ? (
            <AiSearchResults result={searchMutation.data} />
          ) : null}
        </div>
      </section>
    </PageContainer>
  )
}

type AiSearchResultsProps = {
  result: AiSearchResult
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
    <div className="flex flex-col gap-6">
      {result.categorySlugs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {m.ai_search_categories_label()}
          </span>
          {result.categorySlugs.map((slug) => {
            return (
              <Badge key={slug} variant="secondary">
                {slug}
              </Badge>
            )
          })}
        </div>
      ) : null}
      <MemesList
        memes={result.memes}
        layoutContext="ai-search"
        queryID={result.queryID}
      />
    </div>
  )
}

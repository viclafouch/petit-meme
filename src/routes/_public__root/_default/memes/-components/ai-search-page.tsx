import React from 'react'
import { SparklesIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { MemesList } from '~/components/Meme/memes-list'
import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import { LoadingButton } from '~/components/ui/loading-button'
import { Textarea } from '~/components/ui/textarea'
import {
  FREE_PLAN_MAX_AI_SEARCHES,
  MAX_PROMPT_LENGTH
} from '~/constants/ai-search'
import { getStudioErrorCode } from '~/constants/error'
import { matchIsRateLimitError } from '~/helpers/error'
import { getAiSearchQuotaQueryOpts } from '~/lib/queries'
import { m } from '~/paraglide/messages.js'
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageHeading
} from '~/routes/_public__root/-components/page-headers'
import type { getAiSearchQuota } from '~/server/ai-search'
import { aiSearchMemes } from '~/server/ai-search'
import { useShowDialog } from '~/stores/dialog.store'

const AI_SEARCH_PROMPT_STORAGE_KEY = 'ai-search-prompt'

function getSearchErrorMessage(error: unknown) {
  if (matchIsRateLimitError(error)) {
    return m.ai_search_error_rate_limit()
  }

  const code = getStudioErrorCode(error)

  if (code === 'AI_SEARCH_QUOTA_EXCEEDED') {
    return m.ai_search_error_quota({ limit: FREE_PLAN_MAX_AI_SEARCHES })
  }

  return m.ai_search_error_generic()
}

function matchIsQuotaExceeded(error: unknown) {
  return getStudioErrorCode(error) === 'AI_SEARCH_QUOTA_EXCEEDED'
}

type AiSearchResult = Awaited<ReturnType<typeof aiSearchMemes>>

export const AiSearchPage = () => {
  const { user } = useRouteContext({ from: '__root__' })
  const showDialog = useShowDialog()
  const queryClient = useQueryClient()
  const isLoggedIn = Boolean(user)
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
    enabled: isLoggedIn
  })

  const searchMutation = useMutation({
    mutationFn: (data: { prompt: string }) => {
      return aiSearchMemes({ data })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getAiSearchQuotaQueryOpts.all
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

  return (
    <PageContainer as="main">
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
          <div className="flex items-center justify-between gap-4">
            {isLoggedIn && quotaQuery.data ? (
              <QuotaBadge quota={quotaQuery.data} />
            ) : (
              <div />
            )}
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
        {searchMutation.error ? (
          <div
            role="alert"
            className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center"
          >
            <p className="text-muted-foreground text-sm">
              {getSearchErrorMessage(searchMutation.error)}
            </p>
            {matchIsQuotaExceeded(searchMutation.error) ? (
              <Link
                to="/pricing"
                className={buttonVariants({ variant: 'default' })}
              >
                {m.ai_search_cta_premium()}
              </Link>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  searchMutation.reset()
                }}
              >
                {m.ai_search_retry()}
              </Button>
            )}
          </div>
        ) : null}
        <div aria-live="polite">
          {searchMutation.data ? (
            <AiSearchResults result={searchMutation.data} />
          ) : null}
        </div>
      </section>
    </PageContainer>
  )
}

type QuotaBadgeProps = {
  quota: Awaited<ReturnType<typeof getAiSearchQuota>>
}

const QuotaBadge = ({ quota }: QuotaBadgeProps) => {
  if (quota.isPremium) {
    return (
      <Badge variant="secondary" aria-live="polite">
        {m.ai_search_quota_unlimited()}
      </Badge>
    )
  }

  const remaining = Math.max(0, quota.limit - quota.used)

  return (
    <Badge variant="outline" aria-live="polite">
      {m.ai_search_quota_remaining({
        remaining,
        limit: quota.limit
      })}
    </Badge>
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

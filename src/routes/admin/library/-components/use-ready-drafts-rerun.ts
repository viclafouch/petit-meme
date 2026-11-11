import React from 'react'
import { z } from 'zod'
import {
  type Mutation,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { getErrorMessage } from '~/helpers/error'
import {
  getReadyDraftsRerunFillsQueryOpts,
  invalidateAdminMemesOverview
} from '~/routes/admin/-lib/queries'
import type { getReadyDraftsRerunFills } from '~/routes/admin/-server/memes'
import {
  matchIsRerunStepSettled,
  type RerunStart,
  resolveRerunDraftStep
} from '~/routes/admin/library/-lib/ready-drafts-rerun'
import {
  MemeFillInFlightError,
  requestMemeFill
} from '~/routes/admin/library/-lib/request-meme-fill'

const RERUN_MUTATION_KEY = [
  'ready-drafts-rerun'
] as const satisfies readonly string[]
const RERUN_POLL_INTERVAL_MS = 5000

const RERUN_VARIABLES_SCHEMA = z.object({
  runId: z.number(),
  draft: z.object({ id: z.string(), title: z.string() })
})

const RERUN_STARTED_SCHEMA = z.object({ startedAt: z.number() })

type RerunVariables = z.infer<typeof RERUN_VARIABLES_SCHEMA>

export type ReadyDraft = RerunVariables['draft']

const readRerunStart = ({ state }: Mutation): RerunStart => {
  if (state.status === 'success') {
    const started = RERUN_STARTED_SCHEMA.safeParse(state.data)

    return started.success
      ? { status: 'started', startedAt: started.data.startedAt }
      : { status: 'refused', reason: 'Réponse inattendue' }
  }

  if (state.status === 'error') {
    return { status: 'refused', reason: getErrorMessage(state.error) }
  }

  return state.isPaused ? { status: 'queued' } : { status: 'starting' }
}

const selectRerunEntry = (mutation: Mutation) => {
  const variables = RERUN_VARIABLES_SCHEMA.safeParse(mutation.state.variables)

  if (!variables.success) {
    return null
  }

  return { ...variables.data, start: readRerunStart(mutation) }
}

function useLatestRerunEntries() {
  const entries = useMutationState({
    filters: { mutationKey: RERUN_MUTATION_KEY },
    select: selectRerunEntry
  })
  const knownEntries = entries.filter((entry) => {
    return entry !== null
  })
  const latestRunId = Math.max(
    ...knownEntries.map(({ runId }) => {
      return runId
    })
  )

  return knownEntries.filter(({ runId }) => {
    return runId === latestRunId
  })
}

type RerunEntry = ReturnType<typeof useLatestRerunEntries>[number]

type RerunFills = Awaited<ReturnType<typeof getReadyDraftsRerunFills>>

type BuildRerunDraftsParams = {
  entries: RerunEntry[]
  fills: RerunFills | undefined
  fetchedAt: number
}

const buildRerunDrafts = ({
  entries,
  fills,
  fetchedAt
}: BuildRerunDraftsParams) => {
  return entries.map(({ draft, start }) => {
    const fill = fills?.find(({ id }) => {
      return id === draft.id
    })

    return {
      id: draft.id,
      previousTitle: draft.title,
      title: fill?.title ?? draft.title,
      step: resolveRerunDraftStep({
        start,
        fill,
        fetchedAt
      }),
      reason: start.status === 'refused' ? start.reason : null
    }
  })
}

const countSettledDrafts = (drafts: ReturnType<typeof buildRerunDrafts>) => {
  return drafts.filter(({ step }) => {
    return matchIsRerunStepSettled(step)
  }).length
}

export function useReadyDraftsRerun() {
  const queryClient = useQueryClient()
  const entries = useLatestRerunEntries()
  const runId = entries[0]?.runId ?? 0
  const memeIds = entries.map(({ draft }) => {
    return draft.id
  })

  const startMutation = useMutation({
    mutationKey: RERUN_MUTATION_KEY,
    scope: { id: RERUN_MUTATION_KEY[0] },
    gcTime: Infinity,
    mutationFn: async ({ draft }: RerunVariables) => {
      try {
        await requestMemeFill({ memeId: draft.id, customPrompt: '' })
      } catch (error) {
        if (!(error instanceof MemeFillInFlightError)) {
          throw error
        }
      }

      return { startedAt: Date.now() }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: getReadyDraftsRerunFillsQueryOpts.all
      })
    }
  })

  const fillsQuery = useQuery({
    ...getReadyDraftsRerunFillsQueryOpts(runId, memeIds),
    enabled: entries.length > 0,
    refetchInterval: (query) => {
      const drafts = buildRerunDrafts({
        entries,
        fills: query.state.data,
        fetchedAt: query.state.dataUpdatedAt
      })

      return countSettledDrafts(drafts) < drafts.length
        ? RERUN_POLL_INTERVAL_MS
        : false
    }
  })

  const drafts = buildRerunDrafts({
    entries,
    fills: fillsQuery.data,
    fetchedAt: fillsQuery.dataUpdatedAt
  })
  const settledCount = countSettledDrafts(drafts)
  const isRunning = settledCount < drafts.length

  const settledCountRef = React.useRef(settledCount)

  React.useEffect(() => {
    if (settledCount > settledCountRef.current) {
      void invalidateAdminMemesOverview(queryClient)
    }

    settledCountRef.current = settledCount
  }, [settledCount, queryClient])

  const start = (readyDrafts: ReadyDraft[]) => {
    const mutationCache = queryClient.getMutationCache()
    const nextRunId = Date.now()

    for (const mutation of mutationCache.findAll({
      mutationKey: RERUN_MUTATION_KEY,
      predicate: ({ state }) => {
        return state.status !== 'pending'
      }
    })) {
      mutationCache.remove(mutation)
    }

    for (const draft of readyDrafts) {
      startMutation.mutate({ runId: nextRunId, draft })
    }
  }

  return { drafts, settledCount, isRunning, start }
}

export type ReadyDraftsRerun = ReturnType<typeof useReadyDraftsRerun>

export type ReadyDraftsRerunDraft = ReadyDraftsRerun['drafts'][number]

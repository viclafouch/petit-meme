import React from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery
} from '@tanstack/react-query'
import { MEME_FILL_PATH } from '~/constants/meme-fill'
import type { Meme } from '~/db/generated/prisma/client'
import { MemeFillStatus } from '~/db/generated/prisma/enums'
import { getErrorMessage } from '~/helpers/error'
import { matchIsFillInFlight } from '~/helpers/meme-fill'
import {
  getAdminMemeQueryOpts,
  getAdminMemeFillQueryOpts,
  markAdminMemesOverviewStale
} from '~/routes/admin/-lib/queries'
import {
  buildFillSuggestionFromMeme,
  resolveFillNotice,
  resolveFillPollInterval
} from '~/routes/admin/library/-lib/meme-fill'
import {
  keepMemeFillSuggestion,
  settleMemeFillSuggestion
} from '~/server/admin/ai-assist/ai-assist.functions'
import { buildMemeFormValues, type MemeFormApi } from './use-meme-form'

const START_FAILURE_MESSAGE = 'AI Assist n’a pas pu démarrer'

const FILL_ERROR_SCHEMA = z.object({ message: z.string() })

type MemeFillRequest = {
  memeId: Meme['id']
  customPrompt: string
}

async function requestMemeFill(body: MemeFillRequest) {
  const response = await fetch(MEME_FILL_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (response.ok) {
    return
  }

  const payload = FILL_ERROR_SCHEMA.safeParse(
    await response.json().catch(() => {
      return null
    })
  )

  throw new Error(
    payload.success ? payload.data.message : START_FAILURE_MESSAGE
  )
}

type UseMemeFillParams = {
  memeId: Meme['id']
  form: MemeFormApi
  matchHasUnsavedEdits: () => boolean
}

export function useMemeFill({
  memeId,
  form,
  matchHasUnsavedEdits
}: UseMemeFillParams) {
  const queryClient = useQueryClient()
  const fillQueryOpts = getAdminMemeFillQueryOpts(memeId)

  const fillQuery = useSuspenseQuery({
    ...fillQueryOpts,
    refetchInterval: (query) => {
      return resolveFillPollInterval(query.state.data)
    }
  })
  const notice = resolveFillNotice(fillQuery.data)

  const startMutation = useMutation({
    mutationKey: ['meme-fill', memeId],
    mutationFn: (customPrompt: string) => {
      return requestMemeFill({ memeId, customPrompt })
    },
    onSuccess: () => {
      toast.success('AI Assist lancé', {
        description: 'Vous pouvez quitter la page, le résultat vous attendra.'
      })

      return queryClient.invalidateQueries(fillQueryOpts)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const settleSuggestionMutation = useMutation({
    mutationKey: ['meme-fill-settle', memeId],
    mutationFn: (isApplied: boolean) => {
      return settleMemeFillSuggestion({ data: { memeId, isApplied } })
    },
    onSuccess: () => {
      return queryClient.invalidateQueries(fillQueryOpts)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    }
  })

  const pickUpFilledDraft = async () => {
    const [meme] = await Promise.all([
      queryClient.query({
        ...getAdminMemeQueryOpts(memeId),
        staleTime: 0
      }),
      markAdminMemesOverviewStale(queryClient)
    ])

    if (matchHasUnsavedEdits()) {
      await keepMemeFillSuggestion({
        data: { memeId, suggestion: buildFillSuggestionFromMeme(meme) }
      })
      await queryClient.invalidateQueries(fillQueryOpts)
      toast.info('Proposition de l’IA prête', {
        description:
          'Vos modifications en cours restent. Relisez la proposition dans la carte Contenu.'
      })

      return
    }

    form.reset(buildMemeFormValues(meme))
    toast.success('Brouillon rempli par l’IA')
  }

  const settleFill = async () => {
    if (fillQuery.data.status !== MemeFillStatus.FILLED) {
      return
    }

    if (fillQuery.data.suggestion) {
      toast.success('Proposition de l’IA prête', {
        description: 'Relisez-la dans la carte Contenu.'
      })

      return
    }

    try {
      await pickUpFilledDraft()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleFillSettled = React.useEffectEvent(() => {
    void settleFill()
  })

  const isInFlight = matchIsFillInFlight(fillQuery.data.status)
  const wasInFlightRef = React.useRef(isInFlight)

  React.useEffect(() => {
    if (isInFlight) {
      wasInFlightRef.current = true

      return
    }

    if (wasInFlightRef.current) {
      wasInFlightRef.current = false
      handleFillSettled()
    }
  }, [isInFlight])

  return {
    fill: fillQuery.data,
    notice,
    isRunning: notice === 'RUNNING' || notice === 'WAITING_VIDEO',
    start: startMutation,
    settleSuggestion: settleSuggestionMutation
  }
}

export type MemeFill = ReturnType<typeof useMemeFill>

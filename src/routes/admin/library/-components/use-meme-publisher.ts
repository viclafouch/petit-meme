import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { MemeFullData } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import {
  invalidateAdminMemesOverview,
  invalidateSavedMeme
} from '~/routes/admin/-lib/queries'
import { editMeme } from '~/routes/admin/-server/memes'
import {
  getPublishRunSteps,
  type PublishRun,
  type PublishRunKind,
  type PublishStep
} from '~/routes/admin/library/-lib/publish-run'
import { useMemeFilesEngine } from './use-meme-files-engine'
import type { MemeFormValues } from './use-meme-form'

export type MemePublisherRun = PublishRun & {
  id: number
  progress: number | null
  error: string | null
}

export const getMemeEditScope = (memeId: MemeFullData['id']) => {
  return `edit-meme-${memeId}`
}

export function useMemePublisher(meme: MemeFullData) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const filesEngine = useMemeFilesEngine(meme.id)
  const [run, setRun] = React.useState<MemePublisherRun | null>(null)

  const publishMutation = useMutation({
    mutationKey: ['publish-meme', meme.id],
    scope: { id: getMemeEditScope(meme.id) },
    mutationFn: (values: MemeFormValues) => {
      return editMeme({
        data: { ...values, status: MemeStatus.PUBLISHED, id: meme.id }
      })
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateAdminMemesOverview(queryClient),
        invalidateSavedMeme(queryClient, meme.id)
      ])
      await router.invalidate()
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-edit')
    }
  })

  const enterStep = (step: PublishStep) => {
    setRun((current) => {
      return current && { ...current, step, progress: null }
    })
  }

  const setProgress = (progress: number) => {
    setRun((current) => {
      return current && { ...current, progress }
    })
  }

  const generateFiles = () => {
    return filesEngine.generateFiles({
      onStep: enterStep,
      onProgress: setProgress
    })
  }

  const execute = async (kind: PublishRunKind, task: () => Promise<void>) => {
    const [firstStep] = getPublishRunSteps(kind)

    setRun({
      id: Date.now(),
      kind,
      step: firstStep,
      outcome: 'running',
      progress: null,
      error: null
    })

    try {
      await task()
      setRun((current) => {
        return current && { ...current, outcome: 'succeeded', progress: null }
      })
    } catch (error) {
      setRun((current) => {
        return (
          current && {
            ...current,
            outcome: 'failed',
            progress: null,
            error: getErrorMessage(error)
          }
        )
      })
    }
  }

  const publish = (values: MemeFormValues) => {
    return execute('publish', async () => {
      await generateFiles()
      enterStep('saving')
      await publishMutation.mutateAsync(values)
    })
  }

  const regenerate = () => {
    return execute('regenerate', generateFiles)
  }

  return {
    run,
    isRunning: run?.outcome === 'running',
    missingFiles: filesEngine.missingFiles,
    publish,
    regenerate
  }
}

export type MemePublisher = ReturnType<typeof useMemePublisher>

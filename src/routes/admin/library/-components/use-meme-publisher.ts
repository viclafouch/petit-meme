import React from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { MemeFullData } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import {
  invalidateAdminMemesOverview,
  invalidateSavedMeme
} from '~/queries/admin/meme'
import {
  enterPublishStep,
  settlePublishRun,
  startPublishRun,
  trackPublishProgress,
  type MemePublishRun,
  type PublishRunKind,
  type PublishStep
} from '~/routes/admin/library/-lib/publish-run'
import {
  updateMeme,
  updateMemeStatus
} from '~/server/admin/meme/meme.functions'
import { useMemeFilesEngine } from './use-meme-files-engine'
import type { MemeFormValues } from './use-meme-form'

export type StatusTransition = {
  status: MemeStatus
  label: string
  successMessage: string
}

export const getMemeEditScope = (memeId: MemeFullData['id']) => {
  return `edit-meme-${memeId}`
}

export function useMemePublisher(meme: MemeFullData) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const filesEngine = useMemeFilesEngine(meme.id)
  const [run, setRun] = React.useState<MemePublishRun | null>(null)

  const refreshSavedMeme = async () => {
    await Promise.all([
      invalidateAdminMemesOverview(queryClient),
      invalidateSavedMeme(queryClient, meme.id)
    ])
    await router.invalidate()
  }

  const publishMutation = useMutation({
    mutationKey: ['publish-meme', meme.id],
    scope: { id: getMemeEditScope(meme.id) },
    mutationFn: async (values: MemeFormValues) => {
      await updateMeme({ data: { ...values, id: meme.id } })
      await updateMemeStatus({
        data: { id: meme.id, status: MemeStatus.PUBLISHED }
      })
    },
    onSuccess: refreshSavedMeme,
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-edit')
    }
  })

  const statusMutation = useMutation({
    mutationKey: ['meme-status', meme.id],
    scope: { id: getMemeEditScope(meme.id) },
    mutationFn: (status: MemeStatus) => {
      return updateMemeStatus({ data: { id: meme.id, status } })
    },
    onSuccess: refreshSavedMeme,
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-edit')
    }
  })

  const enterStep = (step: PublishStep) => {
    setRun((current) => {
      return current && enterPublishStep(current, step)
    })
  }

  const setProgress = (progress: number) => {
    setRun((current) => {
      return current && trackPublishProgress(current, progress)
    })
  }

  const settleRun = (error: string | null) => {
    setRun((current) => {
      return current && settlePublishRun(current, error)
    })
  }

  const generateFiles = () => {
    return filesEngine.generateFiles({
      onStep: enterStep,
      onProgress: setProgress
    })
  }

  const execute = async (kind: PublishRunKind, task: () => Promise<void>) => {
    setRun(startPublishRun(kind, Date.now()))

    try {
      await task()
      settleRun(null)
    } catch (error) {
      settleRun(getErrorMessage(error))
    }
  }

  const publish = (values: MemeFormValues) => {
    const hasAllFiles = filesEngine.missingFiles?.length === 0

    if (hasAllFiles) {
      return execute('publish', async () => {
        await publishMutation.mutateAsync(values)
      })
    }

    return execute('publish-with-files', async () => {
      await generateFiles()
      enterStep('saving')
      await publishMutation.mutateAsync(values)
    })
  }

  const changeStatus = async (transition: StatusTransition) => {
    try {
      await statusMutation.mutateAsync(transition.status)
      setRun(null)
      toast.success(transition.successMessage)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const regenerate = () => {
    return execute('regenerate', generateFiles)
  }

  return {
    run,
    isRunning: run?.outcome === 'running',
    isChangingStatus: statusMutation.isPending,
    missingFiles: filesEngine.missingFiles,
    publish,
    regenerate,
    changeStatus
  }
}

export type MemePublisher = ReturnType<typeof useMemePublisher>

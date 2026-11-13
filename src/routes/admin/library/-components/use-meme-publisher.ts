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

type GenerateFilesVariables = {
  valuesToPublish: MemeFormValues | null
}

export const getMemeEditScope = (memeId: MemeFullData['id']) => {
  return `edit-meme-${memeId}`
}

export function useMemePublisher(meme: MemeFullData) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const filesEngine = useMemeFilesEngine(meme)
  const [run, setRun] = React.useState<MemePublishRun | null>(null)

  const refreshSavedMeme = async () => {
    await Promise.all([
      invalidateAdminMemesOverview(queryClient),
      invalidateSavedMeme(queryClient, meme.id)
    ])
    await router.invalidate()
  }

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

  const publishMutation = useMutation({
    mutationKey: ['publish-meme', meme.id],
    scope: { id: getMemeEditScope(meme.id) },
    mutationFn: async (values: MemeFormValues) => {
      await updateMeme({ data: { ...values, id: meme.id } })
      await updateMemeStatus({
        data: { id: meme.id, status: MemeStatus.PUBLISHED }
      })
    },
    onSuccess: async () => {
      await refreshSavedMeme()
      settleRun(null)
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-edit')
      settleRun(getErrorMessage(error))
    }
  })

  const generateMutation = useMutation({
    mutationKey: ['generate-meme-files', meme.id],
    mutationFn: (_variables: GenerateFilesVariables) => {
      return filesEngine.generateFiles({
        onStep: enterStep,
        onProgress: setProgress
      })
    },
    onSuccess: async (_data, { valuesToPublish }) => {
      await filesEngine.refreshMissingFiles()

      if (valuesToPublish === null) {
        settleRun(null)

        return
      }

      enterStep('saving')
      publishMutation.mutate(valuesToPublish)
    },
    onError: async (error) => {
      captureWithFeature(error, 'admin-meme-files')
      await filesEngine.refreshMissingFiles()
      settleRun(getErrorMessage(error))
    }
  })

  const statusMutation = useMutation({
    mutationKey: ['meme-status', meme.id],
    scope: { id: getMemeEditScope(meme.id) },
    mutationFn: ({ status }: StatusTransition) => {
      return updateMemeStatus({ data: { id: meme.id, status } })
    },
    onSuccess: async (_data, { successMessage }) => {
      await refreshSavedMeme()
      setRun(null)
      toast.success(successMessage)
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-edit')
      toast.error(getErrorMessage(error))
    }
  })

  const publish = (values: MemeFormValues) => {
    const hasAllFiles = filesEngine.missingFiles?.length === 0

    if (hasAllFiles) {
      setRun(startPublishRun('publish', Date.now()))
      publishMutation.mutate(values)

      return
    }

    setRun(startPublishRun('publish-with-files', Date.now()))
    generateMutation.mutate({ valuesToPublish: values })
  }

  const changeStatus = (transition: StatusTransition) => {
    statusMutation.mutate(transition)
  }

  const regenerate = () => {
    setRun(startPublishRun('regenerate', Date.now()))
    generateMutation.mutate({ valuesToPublish: null })
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

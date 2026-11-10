import { toast } from 'sonner'
import { useAsyncDebouncer } from '@tanstack/react-pacer'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import type { MemeFullData } from '~/constants/meme'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import {
  getAdminMemeByIdQueryOpts,
  invalidateSavedMeme,
  markAdminMemesOverviewStale
} from '~/routes/admin/-lib/queries'
import { editMeme, MEME_FORM_SCHEMA } from '~/routes/admin/-server/memes'
import { resolveAutosaveStatus } from '~/routes/admin/library/-lib/autosave-status'
import type { MemeFormValues } from './use-meme-form'
import { getMemeEditScope } from './use-meme-publisher'

const AUTOSAVE_DELAY_MS = 1500

export function useMemeAutosave(meme: MemeFullData) {
  const queryClient = useQueryClient()
  const toastId = `autosave-meme-${meme.id}`

  const readSavedStatus = () => {
    return (
      queryClient.getQueryData(getAdminMemeByIdQueryOpts(meme.id).queryKey)
        ?.status ?? meme.status
    )
  }

  const saveMutation = useMutation({
    mutationKey: ['autosave-meme', meme.id],
    scope: { id: getMemeEditScope(meme.id) },
    mutationFn: (values: MemeFormValues) => {
      const status = resolveAutosaveStatus({
        savedStatus: readSavedStatus(),
        selectedStatus: values.status
      })

      return editMeme({ data: { ...values, status, id: meme.id } })
    },
    onSuccess: () => {
      return Promise.all([
        invalidateSavedMeme(queryClient, meme.id),
        markAdminMemesOverviewStale(queryClient)
      ])
    },
    onError: (error) => {
      captureWithFeature(error, 'admin-meme-edit')
    }
  })

  const save = async (values: MemeFormValues) => {
    const status = resolveAutosaveStatus({
      savedStatus: readSavedStatus(),
      selectedStatus: values.status
    })

    if (!MEME_FORM_SCHEMA.safeParse({ ...values, status }).success) {
      toast.warning('Non enregistré', {
        id: toastId,
        description: 'Un champ est invalide.',
        duration: Infinity
      })

      return false
    }

    const savePromise = saveMutation.mutateAsync(values)

    toast.promise(savePromise, {
      id: toastId,
      loading: 'Enregistrement...',
      success: 'Enregistré',
      error: (error) => {
        return {
          message: "Échec de l'enregistrement",
          description: getErrorMessage(error),
          duration: Infinity,
          action: {
            label: 'Réessayer',
            onClick: () => {
              void save(values)
            }
          }
        }
      }
    })

    try {
      await savePromise

      return true
    } catch {
      return false
    }
  }

  const debouncer = useAsyncDebouncer<typeof save, { isPending: boolean }>(
    save,
    {
      wait: AUTOSAVE_DELAY_MS,
      onUnmount: (pendingDebouncer) => {
        void pendingDebouncer.flush()
      }
    },
    (state) => {
      return { isPending: state.isPending }
    }
  )

  useBlocker({
    shouldBlockFn: () => {
      return false
    },
    enableBeforeUnload: () => {
      return debouncer.state.isPending || saveMutation.isPending
    }
  })

  return {
    schedule: (values: MemeFormValues) => {
      void debouncer.maybeExecute(values)
    },
    matchHasUnsavedValues: () => {
      return (
        debouncer.state.isPending ||
        saveMutation.isPending ||
        saveMutation.isError
      )
    }
  }
}

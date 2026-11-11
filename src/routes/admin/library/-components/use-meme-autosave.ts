import { toast } from 'sonner'
import { useDebouncer } from '@tanstack/react-pacer'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import type { MemeFullData } from '~/constants/meme'
import { getMemeFormSchema } from '~/constants/meme-form'
import { getErrorMessage } from '~/helpers/error'
import { captureWithFeature } from '~/lib/sentry'
import {
  getAdminMemeQueryOpts,
  invalidateSavedMeme,
  markAdminMemesOverviewStale
} from '~/queries/admin/meme'
import { updateMeme } from '~/server/admin/meme/meme.functions'
import type { MemeFormValues } from './use-meme-form'
import { getMemeEditScope } from './use-meme-publisher'

const AUTOSAVE_DELAY_MS = 1500

export function useMemeAutosave(meme: MemeFullData) {
  const queryClient = useQueryClient()
  const toastId = `autosave-meme-${meme.id}`

  const readSavedStatus = () => {
    return (
      queryClient.getQueryData(getAdminMemeQueryOpts(meme.id).queryKey)
        ?.status ?? meme.status
    )
  }

  const saveMutation = useMutation({
    mutationKey: ['autosave-meme', meme.id],
    scope: { id: getMemeEditScope(meme.id) },
    mutationFn: (values: MemeFormValues) => {
      return updateMeme({ data: { ...values, id: meme.id } })
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateSavedMeme(queryClient, meme.id),
        markAdminMemesOverviewStale(queryClient)
      ])
      toast.success('Enregistré', { id: toastId })
    },
    onError: (error, values) => {
      captureWithFeature(error, 'admin-meme-edit')
      toast.error("Échec de l'enregistrement", {
        id: toastId,
        description: getErrorMessage(error),
        duration: Infinity,
        action: {
          label: 'Réessayer',
          onClick: () => {
            save(values)
          }
        }
      })
    }
  })

  const save = (values: MemeFormValues) => {
    if (!getMemeFormSchema(readSavedStatus()).safeParse(values).success) {
      toast.warning('Non enregistré', {
        id: toastId,
        description: 'Un champ est invalide.',
        duration: Infinity
      })

      return
    }

    toast.loading('Enregistrement...', { id: toastId })

    saveMutation.mutate(values)
  }

  const debouncer = useDebouncer<typeof save, { isPending: boolean }>(
    save,
    {
      wait: AUTOSAVE_DELAY_MS,
      onUnmount: (pendingDebouncer) => {
        pendingDebouncer.flush()
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
      debouncer.maybeExecute(values)
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

import {
  type MutationKey,
  type QueryKey,
  useMutation,
  type UseMutationOptions
} from '@tanstack/react-query'

type UseSyncedMutationParams<TData, TError, TVariables, TOnMutateResult> =
  UseMutationOptions<TData, TError, TVariables, TOnMutateResult> & {
    mutationKey: MutationKey
    syncedQueryKeys: QueryKey[]
    onMutate: NonNullable<
      UseMutationOptions<TData, TError, TVariables, TOnMutateResult>['onMutate']
    >
  }

export const useSyncedMutation = <TData, TError, TVariables, TOnMutateResult>({
  syncedQueryKeys,
  onMutate,
  onSettled,
  ...options
}: UseSyncedMutationParams<TData, TError, TVariables, TOnMutateResult>) => {
  return useMutation({
    ...options,
    onMutate: async (variables, context) => {
      await Promise.all(
        syncedQueryKeys.map((queryKey) => {
          return context.client.cancelQueries({ queryKey })
        })
      )

      return onMutate(variables, context)
    },
    onSettled: async (...settledArgs) => {
      const { client } = settledArgs[4]

      await onSettled?.(...settledArgs)

      const isLastMutation =
        client.isMutating({ mutationKey: options.mutationKey }) === 1

      if (!isLastMutation) {
        return
      }

      await Promise.all(
        syncedQueryKeys.map((queryKey) => {
          return client.invalidateQueries({ queryKey })
        })
      )
    }
  })
}

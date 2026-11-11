import type { Query, QueryClient } from '@tanstack/react-query'

declare module '@tanstack/react-query' {
  // oxlint-disable-next-line consistent-type-definitions -- TS module augmentation requires interface
  interface Register {
    queryMeta: {
      isPrivate?: boolean
    }
  }
}

const matchIsPrivateQuery = (query: Query) => {
  return query.meta?.isPrivate === true
}

export const removePrivateQueries = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries({ predicate: matchIsPrivateQuery })
  queryClient.removeQueries({ predicate: matchIsPrivateQuery })
}
